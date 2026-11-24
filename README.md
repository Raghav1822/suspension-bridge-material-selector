# Strand — Suspension Bridge Cable Material Studio

A small, browser-based screening tool and MATLAB reference model for comparing galvanized bridge cable wire grades. The app turns cable tension, length, and a screening safety factor into required metallic area, cable mass, elongation, cost, and estimated embodied carbon. It ranks the grades against eight adjustable criteria.

**Live app:** https://raghav1822.github.io/suspension-bridge-material-selector/

## Run the web app

Open `index.html` in a browser, or serve this directory using any static web server. The app has no build step or runtime dependencies; Google Fonts are optional and have system fallbacks.

## Material data and assumptions

The four grades and their ultimate tensile strengths (1570, 1770, 1860, 1960 MPa) and density (7850 kg/m³) are the supplied reference values. The user-provided brief did not specify proof strengths, modulus, fatigue/corrosion ratings, wire price, or carbon factors. Those values in `app.js` are **illustrative assumptions** for demonstration, not grade-certified properties or supplier quotations: proof strength is estimated at 85% of UTS; modulus is 200 GPa; fatigue and corrosion are 3.2/5; cost varies from $1.75 to $2.10/kg; embodied carbon is 2.05 kg CO₂e/kg. Edit the source with project-specific, traceable material data before relying on the ranking. The app explicitly identifies these estimates in each material profile.

Scores are min–max normalized to the current four candidates. Higher is better for strength, modulus, fatigue, and corrosion; lower is better for cost and carbon. Weights are normalized by their total, so a total other than 100% is still valid. Strength and strength-to-weight are both included as requested, and are correlated for these equal-density steel grades.

## Screening equations

- Allowable stress: `σ_allow = σ_UTS / N`
- Required metallic area: `A = F / σ_allow`
- Cable mass: `m = ρ A L`
- Elastic elongation: `δ = F L / (A E)`
- Material cost: `C = m C_kg`
- Specific strength: `σ_UTS / ρ`
- Embodied carbon: `CO₂e = m EF`

Inputs use kN, MPa, m, kg/m³, GPa, and USD/kg; unit conversions are performed in the calculation. The required area is a simplified metallic area and does not account for void ratio, wire packing, coatings, sockets, cable sag, load combinations, fatigue design curves, losses, or code requirements. Not for construction, procurement, certification, or safety-critical design.

## MATLAB reference implementation

`matlab/screenCableMaterials.m` implements the same area, mass, elongation, cost, carbon, and weighted ranking calculations in MATLAB. Pass a table with columns `Name`, `UTS_MPa`, `Density_kg_m3`, `E_GPa`, `ProofRatio`, `FatigueScore`, `CorrosionScore`, `CostPerKg`, `EF`, and a struct with the eight criterion weights (`UTS`, `Proof`, `Specific`, `Modulus`, `Fatigue`, `Corrosion`, `Cost`, `Carbon`). See the function header for input checks and output columns.

## Deploy

The GitHub Actions workflow in `.github/workflows/pages.yml` publishes the static site to GitHub Pages when changes are pushed to `main` and on manual runs.
