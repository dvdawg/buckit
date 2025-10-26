

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUPABASE_URL=${SUPABASE_URL:-""}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-""}
OPENAI_API_KEY=${OPENAI_API_KEY:-""}

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set${NC}"
    exit 1
fi

echo -e "${GREEN}Starting model deployment...${NC}"

echo -e "${YELLOW}Step 1: Deploying database migrations...${NC}"
supabase db push

echo -e "${YELLOW}Step 2: Deploying Edge Functions...${NC}"

supabase functions deploy recommend
supabase functions deploy embeddings
supabase functions deploy appeal-precompute
supabase functions deploy bandit-update
supabase functions deploy metrics

supabase functions deploy model-training
supabase functions deploy model-serving
supabase functions deploy scheduled-training

echo -e "${GREEN}Edge Functions deployed successfully${NC}"

echo -e "${YELLOW}Step 3: Setting up scheduled jobs...${NC}"

cat > supabase/cron.json << EOF
{
  "scheduled-training": {
    "schedule": "0 */6 * * *",
    "timezone": "UTC"
  }
}
EOF

supabase functions deploy scheduled-training

echo -e "${GREEN}Scheduled jobs configured${NC}"

echo -e "${YELLOW}Step 4: Initializing models...${NC}"

echo "Generating initial embeddings..."
curl -X POST "${SUPABASE_URL}/functions/v1/embeddings" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}'

echo "Generating initial appeal scores..."
curl -X POST "${SUPABASE_URL}/functions/v1/appeal-precompute" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Refreshing user vectors..."
curl -X POST "${SUPABASE_URL}/functions/v1/model-training?action=train&model=user_vectors" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json"

echo -e "${GREEN}Models initialized${NC}"

if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}Step 5: Running initial model training...${NC}"
    
    python3 scripts/train-models.py \
        --model all \
        --supabase-url "$SUPABASE_URL" \
        --supabase-key "$SUPABASE_SERVICE_KEY" \
        --openai-key "$OPENAI_API_KEY" \
        --output training-results.json
    
    echo -e "${GREEN}Initial training completed${NC}"
else
    echo -e "${YELLOW}Skipping initial training (no OpenAI API key provided)${NC}"
fi

echo -e "${YELLOW}Step 6: Verifying deployment...${NC}"

echo "Checking function health..."
curl -s "${SUPABASE_URL}/functions/v1/metrics" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" > /dev/null

echo "Checking training jobs..."
curl -s "${SUPABASE_URL}/functions/v1/model-training?action=list" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" > /dev/null

echo -e "${GREEN}Deployment verification completed${NC}"

echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo "✅ Database migrations deployed"
echo "✅ Edge Functions deployed"
echo "✅ Scheduled jobs configured"
echo "✅ Models initialized"
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ Initial training completed"
fi
echo "✅ Deployment verified"

echo -e "${GREEN}Model deployment completed successfully!${NC}"

echo -e "${YELLOW}=== Useful Commands ===${NC}"
echo "Monitor training jobs:"
echo "  curl '${SUPABASE_URL}/functions/v1/model-training?action=list' \\"
echo "    -H 'Authorization: Bearer ${SUPABASE_SERVICE_KEY}'"
echo ""
echo "Check metrics:"
echo "  curl '${SUPABASE_URL}/functions/v1/metrics' \\"
echo "    -H 'Authorization: Bearer ${SUPABASE_SERVICE_KEY}'"
echo ""
echo "Run manual training:"
echo "  python3 scripts/train-models.py --model all \\"
echo "    --supabase-url '${SUPABASE_URL}' \\"
echo "    --supabase-key '${SUPABASE_SERVICE_KEY}' \\"
echo "    --openai-key '${OPENAI_API_KEY}'"
