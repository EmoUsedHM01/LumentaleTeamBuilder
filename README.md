# Lumentale Team Builder

Static GitHub Pages team builder for Lumentale.

## Local Use

Generate app data from the workspace exports:

```powershell
node .\scripts\build-data.mjs
```

Serve locally:

```powershell
node .\scripts\serve.mjs
```

Then open `http://localhost:4173`.

## Data Sources

- `../DamageCalculatorResearch/data/forms.json`
- `../DamageCalculatorResearch/data/moves.json`
- `../DamageCalculatorResearch/data/stat_formula.json`
- `../DamageCalculatorResearch/data/type_chart.json`
- `../AnimonInventoryGifs_Scale1_12fps/manifest.json`

The builder stores level-100 BP allocation and previews level-50 battle stats for PvP/damage-calculator checks.

