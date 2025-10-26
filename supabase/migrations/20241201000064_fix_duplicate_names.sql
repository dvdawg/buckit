-- Fix duplicate 'Smith' names in friends activity
-- Update the test users with diverse last names

-- Update users with diverse last names
UPDATE users 
SET 
    full_name = CASE 
        WHEN id = '0104e50a-53f4-4ae8-bf93-d15c6b65d262' THEN 'John Smith'
        WHEN id = '01efb100-3292-4ee8-80cb-359d4339a236' THEN 'Rachel Wilson'
        WHEN id = '0551092a-4b69-4222-bec5-c3627264e6c0' THEN 'Cheryl Jones'
        WHEN id = '07a522aa-08b1-4331-a625-5e5a98d5f48d' THEN 'Christopher Brown'
        WHEN id = '07c3cbfc-ca35-449e-847b-fa09c87bc650' THEN 'Scott Davis'
        WHEN id = '08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0' THEN 'Frances Miller'
        WHEN id = '0a1278a4-7b5c-47d6-84e9-69fbf8489888' THEN 'Brenda Wilson'
        WHEN id = '0dfd16ba-286a-4e4c-a47e-79b2b3be4bb0' THEN 'Joseph Moore'
        WHEN id = '0f26add2-a3b3-4454-a72e-675dd3982de0' THEN 'Sean Taylor'
        WHEN id = '10faf8ea-5880-477d-bb4e-d3814c476a1d' THEN 'Megan Anderson'
        WHEN id = '17324414-91f6-4047-b958-5276f3bc7936' THEN 'Daniel Thomas'
        WHEN id = '19a0f163-4d06-4c61-879b-f9ba47ba6875' THEN 'Gary Jackson'
        WHEN id = '1b7a285b-3ec1-4692-bc72-5447ce458750' THEN 'Anthony White'
        WHEN id = '1ca6553d-8d24-441b-8aed-d6f962dd68e0' THEN 'Arthur Harris'
        WHEN id = '20ce621f-1a1c-479f-944c-9127d051ab7d' THEN 'Amy Martin'
        ELSE full_name
    END,
    handle = CASE 
        WHEN id = '0104e50a-53f4-4ae8-bf93-d15c6b65d262' THEN 'johnsmith266'
        WHEN id = '01efb100-3292-4ee8-80cb-359d4339a236' THEN 'rachelwilson312'
        WHEN id = '0551092a-4b69-4222-bec5-c3627264e6c0' THEN 'cheryljones947'
        WHEN id = '07a522aa-08b1-4331-a625-5e5a98d5f48d' THEN 'christopherbrown200'
        WHEN id = '07c3cbfc-ca35-449e-847b-fa09c87bc650' THEN 'scottdavis187'
        WHEN id = '08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0' THEN 'francesmiller286'
        WHEN id = '0a1278a4-7b5c-47d6-84e9-69fbf8489888' THEN 'brendawilson795'
        WHEN id = '0dfd16ba-286a-4e4c-a47e-79b2b3be4bb0' THEN 'josephmoore399'
        WHEN id = '0f26add2-a3b3-4454-a72e-675dd3982de0' THEN 'seantaylor275'
        WHEN id = '10faf8ea-5880-477d-bb4e-d3814c476a1d' THEN 'megananderson967'
        WHEN id = '17324414-91f6-4047-b958-5276f3bc7936' THEN 'danielthomas422'
        WHEN id = '19a0f163-4d06-4c61-879b-f9ba47ba6875' THEN 'garyjackson246'
        WHEN id = '1b7a285b-3ec1-4692-bc72-5447ce458750' THEN 'anthonywhite607'
        WHEN id = '1ca6553d-8d24-441b-8aed-d6f962dd68e0' THEN 'arthurharris816'
        WHEN id = '20ce621f-1a1c-479f-944c-9127d051ab7d' THEN 'amymartin344'
        ELSE handle
    END
WHERE id IN (
    '0104e50a-53f4-4ae8-bf93-d15c6b65d262',
    '01efb100-3292-4ee8-80cb-359d4339a236',
    '0551092a-4b69-4222-bec5-c3627264e6c0',
    '07a522aa-08b1-4331-a625-5e5a98d5f48d',
    '07c3cbfc-ca35-449e-847b-fa09c87bc650',
    '08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0',
    '0a1278a4-7b5c-47d6-84e9-69fbf8489888',
    '0dfd16ba-286a-4e4c-a47e-79b2b3be4bb0',
    '0f26add2-a3b3-4454-a72e-675dd3982de0',
    '10faf8ea-5880-477d-bb4e-d3814c476a1d',
    '17324414-91f6-4047-b958-5276f3bc7936',
    '19a0f163-4d06-4c61-879b-f9ba47ba6875',
    '1b7a285b-3ec1-4692-bc72-5447ce458750',
    '1ca6553d-8d24-441b-8aed-d6f962dd68e0',
    '20ce621f-1a1c-479f-944c-9127d051ab7d'
);

-- Log the update results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM users 
    WHERE id IN (
        '0104e50a-53f4-4ae8-bf93-d15c6b65d262',
        '01efb100-3292-4ee8-80cb-359d4339a236',
        '0551092a-4b69-4222-bec5-c3627264e6c0',
        '07a522aa-08b1-4331-a625-5e5a98d5f48d',
        '07c3cbfc-ca35-449e-847b-fa09c87bc650',
        '08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0',
        '0a1278a4-7b5c-47d6-84e9-69fbf8489888',
        '0dfd16ba-286a-4e4c-a47e-79b2b3be4bb0',
        '0f26add2-a3b3-4454-a72e-675dd3982de0',
        '10faf8ea-5880-477d-bb4e-d3814c476a1d',
        '17324414-91f6-4047-b958-5276f3bc7936',
        '19a0f163-4d06-4c61-879b-f9ba47ba6875',
        '1b7a285b-3ec1-4692-bc72-5447ce458750',
        '1ca6553d-8d24-441b-8aed-d6f962dd68e0',
        '20ce621f-1a1c-479f-944c-9127d051ab7d'
    );
    
    RAISE NOTICE 'Updated % users with diverse names', updated_count;
END $$;
