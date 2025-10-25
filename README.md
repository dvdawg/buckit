# Buckit
## Initial Design Mockups
![initial_design](./readme_assets/initial_design.png)
## PRD v1.0
[Read the full document here](https://docs.google.com/document/d/1zJ0PVIeczIu6qECpJUD3cGE9qiwpAGbLtxmicYlJFzo/edit?usp=sharing)

## Technical Design
\[
s(u, i, c) =
\underbrace{\alpha\,\textbf{Appeal}_{\text{MM}}(i)}_{\text{DMN/appeal}}
+ \underbrace{\beta\,\langle \mathbf{z}^{\text{trait}}_u , \mathbf{e}_i\rangle}_{\text{who you are}}
+ \underbrace{\gamma\,\langle \mathbf{z}^{\text{state}}_u(c) , \mathbf{e}_i\rangle}_{\text{how you feel now}}
+ \underbrace{\delta\,\text{SocialBonus}(u,i)}_{\text{vmPFC social}}
- \underbrace{\lambda\,\text{EffortCost}(i,c)}_{\text{value minus cost}}
+ \underbrace{\rho\,\text{Novelty/Diversity}(i \mid \mathcal{L})}_{\text{multi-objective}}
\]
