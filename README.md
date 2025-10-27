# Buckit
Buckit is a social app that turns forgotten bucket list items into shared experiences, using AI to find the next challenge you’ll actually follow through on.

We all have those things we’ve been wanting to do, the weekend trip we’ve postponed, the restaurant we’ve been saving “for when we have time.”

But the truth is: we rarely do them.

In a world where the economy is uncertain, workloads are heavier than ever, and burnout has become the norm, most of us feel too consumed by survival in work and school to pursue what actually makes us feel alive.

Buckit is a social bucket list app that helps people discover, organize, and complete new experiences with friends.

Users create buckets, collections of goals or activities they want to try, think "Trip to San Francisco," "Cafes," "Family." Each bucket contains individual items with details like description, location, and timing.

Friends can join buckets, complete challenges together, and track shared progress.

Buckit's AI model drives exploration features of the app.

Try it. Track it. Buckit.

## Initial Design Mockups
![initial_design](./readme_assets/initial_designs.png)
## PRD v1.0
[Read the full document here (formatted with Chat-GPT)](https://docs.google.com/document/d/1zJ0PVIeczIu6qECpJUD3cGE9qiwpAGbLtxmicYlJFzo/edit?usp=sharing)

## Technical Design
### Scoring
The scoring system for the recommendation system is as follows:

![equation](https://latex.codecogs.com/svg.image?%20s(u,i,c)=%5Cunderbrace%7B%5Calpha%5C,%5Ctextbf%7BAppeal%7D_%7B%5Ctext%7BMM%7D%7D(i)%7D_%7B%5Ctext%7BDMN/appeal%7D%7D&plus;%5Cunderbrace%7B%5Cbeta%5C,%5Clangle%5Cmathbf%7Bz%7D%5E%7B%5Ctext%7Btrait%7D%7D_u,%5Cmathbf%7Be%7D_i%5Crangle%7D_%7B%5Ctext%7Bwho%20you%20are%7D%7D&plus;%5Cunderbrace%7B%5Cgamma%5C,%5Clangle%5Cmathbf%7Bz%7D%5E%7B%5Ctext%7Bstate%7D%7D_u(c),%5Cmathbf%7Be%7D_i%5Crangle%7D_%7B%5Ctext%7Bhow%20you%20feel%20now%7D%7D&plus;%5Cunderbrace%7B%5Cdelta%5C,%5Ctext%7BSocialBonus%7D(u,i)%7D_%7B%5Ctext%7BvmPFC%20social%7D%7D-%5Cunderbrace%7B%5Clambda%5C,%5Ctext%7BEffortCost%7D(i,c)%7D_%7B%5Ctext%7Bvalue%20minus%20cost%7D%7D&plus;%5Cunderbrace%7B%5Crho%5C,%5Ctext%7BNovelty/Diversity%7D(i%5Cmid%5Cmathcal%7BL%7D)%7D_%7B%5Ctext%7Bmulti-objective%7D%7D)

where s represents a score given u (the user), i (the item/activity), and c (the context).

Buckit's recommendation system is based off of brain signals - inspired by vmPFC (ventromedial PreFrontal Cortex) signals, modeling social reward and peer influence, and DMM (Default Mode Network) activity associated with intrinsic valuation and aesthetics. These two are modeled by the SocialBonus and Appeal terms respectively. 

For the remaining terms:
- The z trait represents long term interests constituted by aggregate historical activities and interactions inner producted with the embedding of the input item in the same vector space.
- The z state represents shorter term interests derived from DIN-style attention describing latent interests similarly inner producted with the item embeddin.
- The EffortCost represents the "cost" of an item derived from geographical distance and price modeled after vmPFS models on effort vs reward
- The Novelty/Diversity term creates variety, created from MMR and LinUCB Bandit exploration rewards roughly inspired by dopaminagenic novelty networks.

Combining the effect of all of these factors creates a trained comprehensive score, weighted by coefficients alpha, beta, gamma, delta, lambda, and rho.

### Reasoning, Inspiration, and Scientific Backing
The following papers fed into our scoring system design:

#### Human vmPFC is necessary for (pro-)social valuation (Nature Human Behaviour, 2024 — Lockwood et al.)
A lesion study with 25 vmPFC patients with controls using effort-reward tasks in selfish and "prosocial" conditions. These lesions disrupted reward/effort tradeoffs and effort for prosocial behaviors, showing necessity for computing subjective social values.

For Buckit: We implement scalar value function that integrates social parameters and subtracts cost terms. Prosocial features should be weighted in the value computation.

#### Value estimation vs effort mobilization dissociate (J. Neurosci, 2024 — Clairis et al.)
An fMRI study breaking down expected utility from effort with RL/utility models. vmPFC signals track subjective value estimation and dorsomedial PFC track effort. These systems estimate value before energization.

For Buckit: We decouple "appeal" and "executability" in the scoring function. Compute raw value from content features and social bonuses, then apply cost discounting (distance, price, time, coordination complexity). Post-process with an execution feasibility gate that downweights high-friction items. Emphasizes both appeal and feasibility signals in the UI.

#### Default-Mode Network represents aesthetic appeal across domains (PNAS, 2019 — Vessel et al.)
A study on fMRI during visual stimulus viewing across categories. DMN activity patterns encode aesthetic appeal in general domains, independent of category-specific visual processing.

For Buckit: We train a multimodal appeal predictor over CLIP embeddings of activity images, text, and descriptions. Supervising on completion/skip decisions and sentiment annotations creates a computational analog of DMN's aesthetic signal.


#### State-dependent connectivity predicts peak pleasure (PLoS Biology, 2024 — Mori et al.)
A study on resting-state fMRI before music listening. Pre-task connectivity between auditory and reward networks predicted pleasure intensity better than trait-level baselines.

For Buckit: Represent users as trait embeddings (long-run interaction history) plus state embeddings created from context (timestamp, weather, recent activity sequence, location, social configuration). reweight category scores by session state, increasing the weight of indoor/cultural activities during rain/evening, outdoor activities during sun/morning.

#### Multi-objective recommender systems for long-term outcomes (Frontiers in Big Data, 2023 — Jannach et al.)
A survey of recommendation goals besides accuracy: diversity, novelty, fairness, long-term engagement, and more. Covers evaluation frameworks and optimization strategies including constrained reranking, Pareto methods, and exploration-aware bandits.

For Buckit: We define KPIs including verified completions per 1000 impressions and catalog coverage with two-stage ranking: (1) recommended candidate list creation using embedding similarity + geo-filtering; (2) reranking with diversity, novelty, and budget constraints (MMR + fairness bounds).
