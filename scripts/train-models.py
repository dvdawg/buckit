#!/usr/bin/env python3
"""
Comprehensive Model Training Pipeline
Trains and deploys all recommendation system models
"""

import os
import sys
import json
import time
import requests
import argparse
from datetime import datetime
from typing import Dict, List, Optional
import logging

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services', 'recs', 'training'))

from appeal_head_train import AppealHeadTrainer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelTrainingPipeline:
    def __init__(self, supabase_url: str, supabase_key: str, openai_api_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.openai_api_key = openai_api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        })
    
    def create_training_job(self, model_type: str) -> str:
        """Create a training job in the database"""
        response = self.session.post(
            f"{self.supabase_url}/functions/v1/model-training",
            params={'action': 'train', 'model': model_type}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create training job: {response.text}")
        
        data = response.json()
        return data['job_id']
    
    def wait_for_job_completion(self, job_id: str, timeout: int = 3600) -> Dict:
        """Wait for a training job to complete"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            response = self.session.get(
                f"{self.supabase_url}/functions/v1/model-training",
                params={'action': 'status', 'job_id': job_id}
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get job status: {response.text}")
            
            data = response.json()
            status = data['status']
            
            if status == 'completed':
                logger.info(f"Training job {job_id} completed successfully")
                return data
            elif status == 'failed':
                raise Exception(f"Training job {job_id} failed: {data.get('error_message', 'Unknown error')}")
            
            logger.info(f"Training job {job_id} status: {status}")
            time.sleep(30)  # Check every 30 seconds
        
        raise Exception(f"Training job {job_id} timed out after {timeout} seconds")
    
    def train_appeal_head_model(self) -> Dict:
        """Train the appeal head model"""
        logger.info("Starting appeal head model training...")
        
        # Create training job
        job_id = self.create_training_job('appeal_head')
        logger.info(f"Created training job: {job_id}")
        
        # Wait for completion
        result = self.wait_for_job_completion(job_id)
        
        # Deploy the model
        model_version = result.get('model_version')
        if model_version:
            self.deploy_model('appeal_head', model_version)
        
        return result
    
    def refresh_user_vectors(self) -> Dict:
        """Refresh user vectors"""
        logger.info("Refreshing user vectors...")
        
        job_id = self.create_training_job('user_vectors')
        result = self.wait_for_job_completion(job_id)
        
        return result
    
    def refresh_embeddings(self) -> Dict:
        """Refresh item embeddings"""
        logger.info("Refreshing embeddings...")
        
        job_id = self.create_training_job('embeddings')
        result = self.wait_for_job_completion(job_id)
        
        return result
    
    def deploy_model(self, model_type: str, version: str) -> None:
        """Deploy a model version"""
        logger.info(f"Deploying {model_type} model version {version}...")
        
        response = self.session.post(
            f"{self.supabase_url}/functions/v1/model-training",
            params={'action': 'deploy', 'model_version': version}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to deploy model: {response.text}")
        
        logger.info(f"Model {model_type}:{version} deployed successfully")
    
    def get_training_summary(self) -> Dict:
        """Get training job summary"""
        response = self.session.get(
            f"{self.supabase_url}/functions/v1/model-training",
            params={'action': 'list'}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get training summary: {response.text}")
        
        return response.json()
    
    def run_full_pipeline(self) -> Dict:
        """Run the complete training pipeline"""
        logger.info("Starting full model training pipeline...")
        
        results = {
            'started_at': datetime.now().isoformat(),
            'models': {}
        }
        
        try:
            # 1. Refresh embeddings first (needed for other models)
            logger.info("Step 1: Refreshing embeddings...")
            results['models']['embeddings'] = self.refresh_embeddings()
            
            # 2. Refresh user vectors
            logger.info("Step 2: Refreshing user vectors...")
            results['models']['user_vectors'] = self.refresh_user_vectors()
            
            # 3. Train appeal head model
            logger.info("Step 3: Training appeal head model...")
            results['models']['appeal_head'] = self.train_appeal_head_model()
            
            results['status'] = 'completed'
            results['completed_at'] = datetime.now().isoformat()
            
            logger.info("Full training pipeline completed successfully!")
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            results['status'] = 'failed'
            results['error'] = str(e)
            results['failed_at'] = datetime.now().isoformat()
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Train recommendation system models')
    parser.add_argument('--model', choices=['appeal_head', 'user_vectors', 'embeddings', 'all'], 
                       default='all', help='Model to train')
    parser.add_argument('--supabase-url', required=True, help='Supabase URL')
    parser.add_argument('--supabase-key', required=True, help='Supabase service key')
    parser.add_argument('--openai-key', required=True, help='OpenAI API key')
    parser.add_argument('--output', help='Output file for results')
    
    args = parser.parse_args()
    
    # Set environment variables
    os.environ['SUPABASE_URL'] = args.supabase_url
    os.environ['SUPABASE_SERVICE_ROLE_KEY'] = args.supabase_key
    os.environ['OPENAI_API_KEY'] = args.openai_key
    
    # Initialize pipeline
    pipeline = ModelTrainingPipeline(
        args.supabase_url,
        args.supabase_key,
        args.openai_key
    )
    
    # Run training
    if args.model == 'all':
        results = pipeline.run_full_pipeline()
    else:
        if args.model == 'appeal_head':
            results = pipeline.train_appeal_head_model()
        elif args.model == 'user_vectors':
            results = pipeline.refresh_user_vectors()
        elif args.model == 'embeddings':
            results = pipeline.refresh_embeddings()
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
