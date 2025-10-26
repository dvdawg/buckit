#!/usr/bin/env python3
"""
Appeal Head Trainer
Trains a small MLP to predict item appeal from text embeddings.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import onnx
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import requests
from typing import List, Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AppealHeadTrainer:
    def __init__(self, supabase_url: str, supabase_key: str, openai_api_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.openai_api_key = openai_api_key
        self.embed_dim = 1536  # OpenAI embedding dimension
        
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using Claude or OpenAI."""
        # Try Claude first if available
        claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        if claude_api_key:
            try:
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": claude_api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 1024,
                        "messages": [{
                            "role": "user",
                            "content": f"Create a dense vector embedding for this text. Return only a JSON array of {self.embed_dim} floating-point numbers between -1 and 1: \"{text}\""
                        }]
                    },
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                content = data["content"][0]["text"]
                embedding = json.loads(content)
                if isinstance(embedding, list) and len(embedding) == self.embed_dim:
                    return embedding
            except Exception as e:
                logger.error(f"Error getting Claude embedding: {e}")
        
        # Fallback to OpenAI
        try:
            response = requests.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "input": text,
                    "model": "text-embedding-3-small",
                },
                timeout=30
            )
            response.raise_for_status()
            return response.json()["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            return [0.0] * self.embed_dim
    
    def fetch_training_data(self) -> pd.DataFrame:
        """Fetch items with events for training."""
        # Get items with text content
        items_response = requests.post(
            f"{self.supabase_url}/rest/v1/rpc/get_items_with_events",
            headers={
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
            },
            json={}
        )
        
        if items_response.status_code != 200:
            # Fallback: get items and events separately
            items_response = requests.get(
                f"{self.supabase_url}/rest/v1/items",
                headers={
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json",
                },
                params={
                    "select": "id,title,description",
                    "not": "title,is.null"
                }
            )
            
            if items_response.status_code != 200:
                raise Exception(f"Failed to fetch items: {items_response.status_code}")
        
        items = items_response.json()
        logger.info(f"Fetched {len(items)} items")
        
        # Get events for appeal scoring
        events_response = requests.get(
            f"{self.supabase_url}/rest/v1/events",
            headers={
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
            },
            params={
                "select": "item_id,event_type,strength,created_at"
            }
        )
        
        if events_response.status_code != 200:
            raise Exception(f"Failed to fetch events: {events_response.status_code}")
        
        events = events_response.json()
        logger.info(f"Fetched {len(events)} events")
        
        # Process events into appeal scores
        item_events = {}
        for event in events:
            item_id = event['item_id']
            if item_id not in item_events:
                item_events[item_id] = {'positive': 0, 'negative': 0}
            
            # Time decay
            import datetime
            event_time = datetime.datetime.fromisoformat(event['created_at'].replace('Z', '+00:00'))
            age_days = (datetime.datetime.now(datetime.timezone.utc) - event_time).days
            decay = np.exp(-age_days / 30 * np.log(2))  # 30-day half-life
            
            if event['event_type'] in ['complete', 'save', 'like']:
                item_events[item_id]['positive'] += event['strength'] * decay
            elif event['event_type'] in ['hide', 'skip']:
                item_events[item_id]['negative'] += abs(event['strength']) * decay
        
        # Create training data
        training_data = []
        for item in items:
            item_id = item['id']
            title = item.get('title', '')
            description = item.get('description', '')
            text = f"{title} {description}".strip()
            
            if not text:
                continue
            
            events = item_events.get(item_id, {'positive': 0, 'negative': 0})
            total_events = events['positive'] + events['negative']
            
            if total_events == 0:
                continue  # Skip items with no events
            
            appeal_score = events['positive'] / total_events if total_events > 0 else 0.5
            
            training_data.append({
                'item_id': item_id,
                'text': text,
                'appeal_score': appeal_score,
                'total_events': total_events
            })
        
        return pd.DataFrame(training_data)
    
    def train_model(self, df: pd.DataFrame) -> Tuple[MLPRegressor, StandardScaler]:
        """Train the appeal prediction model."""
        logger.info(f"Training on {len(df)} samples")
        
        # Get embeddings for all texts
        embeddings = []
        for text in df['text']:
            embedding = self.get_embedding(text)
            embeddings.append(embedding)
        
        X = np.array(embeddings)
        y = df['appeal_score'].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train MLP
        model = MLPRegressor(
            hidden_layer_sizes=(256, 128),
            activation='relu',
            solver='adam',
            alpha=0.001,
            batch_size=32,
            learning_rate='adaptive',
            max_iter=1000,
            random_state=42
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Model performance - MSE: {mse:.4f}, R²: {r2:.4f}")
        
        return model, scaler
    
    def export_onnx(self, model: MLPRegressor, scaler: StandardScaler, output_path: str):
        """Export model to ONNX format."""
        # Create ONNX model
        initial_type = [('float_input', FloatTensorType([None, self.embed_dim]))]
        
        # Combine scaler and model into a pipeline
        from sklearn.pipeline import Pipeline
        pipeline = Pipeline([
            ('scaler', scaler),
            ('mlp', model)
        ])
        
        onnx_model = convert_sklearn(
            pipeline,
            initial_types=initial_type,
            target_opset=11
        )
        
        # Save ONNX model
        with open(output_path, 'wb') as f:
            f.write(onnx_model.SerializeToString())
        
        logger.info(f"ONNX model saved to {output_path}")
    
    def run_training(self, output_dir: str = "models"):
        """Run the complete training pipeline."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Fetch data
        df = self.fetch_training_data()
        
        if len(df) < 10:
            logger.warning("Not enough training data. Using fallback approach.")
            return
        
        # Train model
        model, scaler = self.train_model(df)
        
        # Save models
        joblib.dump(model, os.path.join(output_dir, "appeal_model.pkl"))
        joblib.dump(scaler, os.path.join(output_dir, "appeal_scaler.pkl"))
        
        # Export to ONNX
        self.export_onnx(model, scaler, os.path.join(output_dir, "appeal_model.onnx"))
        
        logger.info("Training completed successfully!")

def main():
    """Main training script."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not all([supabase_url, supabase_key, openai_api_key]):
        raise ValueError("Missing required environment variables")
    
    trainer = AppealHeadTrainer(supabase_url, supabase_key, openai_api_key)
    trainer.run_training()

if __name__ == "__main__":
    main()
