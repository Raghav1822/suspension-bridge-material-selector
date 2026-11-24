function results = screenCableMaterials(force_kN, length_m, safetyFactor, materials, weights)
%SCREENCABLEMATERIALS Screen cable wire grades for preliminary comparison.
% Inputs:
%   force_kN     Cable tension in kN
%   length_m     Cable length in m
%   safetyFactor Screening factor applied to ultimate tensile strength
%   materials    Table columns: Name, UTS_MPa, Density_kg_m3, E_GPa,
%                ProofRatio, FatigueScore, CorrosionScore, CostPerKg, EF
%   weights      Table columns: UTS, Proof, Specific, Modulus, Fatigue,
%                Corrosion, Cost, Carbon (nonnegative, not required to sum to 1)
% This model is for preliminary comparison only, not cable design or approval.

arguments
    force_kN (1,1) double {mustBePositive}
    length_m (1,1) double {mustBePositive}
    safetyFactor (1,1) double {mustBeGreaterThanOrEqual(safetyFactor, 1)}
    materials table
    weights (1,1) struct
end

required = {'Name','UTS_MPa','Density_kg_m3','E_GPa','ProofRatio', ...
    'FatigueScore','CorrosionScore','CostPerKg','EF'};
if ~all(ismember(required, materials.Properties.VariableNames))
    error('materials is missing one or more required property columns.');
end
weightNames = {'UTS','Proof','Specific','Modulus','Fatigue','Corrosion','Cost','Carbon'};
if ~all(isfield(weights, weightNames))
    error('weights must define UTS, Proof, Specific, Modulus, Fatigue, Corrosion, Cost, and Carbon.');
end
if any(structfun(@(x) ~isscalar(x) || ~isfinite(x) || x < 0, weights))
    error('Each criterion weight must be a finite, nonnegative scalar.');
end
if height(materials) == 0 || any(materials.UTS_MPa <= 0) || ...
        any(materials.Density_kg_m3 <= 0) || any(materials.E_GPa <= 0)
    error('Provide at least one material with positive strength, density, and modulus.');
end

force_N = force_kN * 1000;
allowable_MPa = materials.UTS_MPa ./ safetyFactor;
area_mm2 = force_N ./ allowable_MPa;
area_m2 = area_mm2 * 1e-6;
mass_kg = materials.Density_kg_m3 .* area_m2 .* length_m;
elongation_mm = (force_N .* length_m ./ (area_mm2 * 1e-6 .* materials.E_GPa * 1e9)) * 1000;
proof_MPa = materials.UTS_MPa .* materials.ProofRatio;
specificStrength = materials.UTS_MPa ./ materials.Density_kg_m3;
cost = mass_kg .* materials.CostPerKg;
carbon = mass_kg .* materials.EF;

criteria = {'UTS','Proof','Specific','Modulus','Fatigue','Corrosion','Cost','Carbon'};
values = [materials.UTS_MPa, proof_MPa, specificStrength, materials.E_GPa, ...
    materials.FatigueScore, materials.CorrosionScore, cost, carbon];
directions = [1 1 1 1 1 1 -1 -1];
weightVector = cellfun(@(name) weights.(name), criteria);
if sum(weightVector) == 0
    score = zeros(height(materials), 1);
else
    normalized = zeros(size(values));
    for column = 1:numel(criteria)
        low = min(values(:, column));
        high = max(values(:, column));
        if high == low
            normalized(:, column) = 100;
        elseif directions(column) > 0
            normalized(:, column) = (values(:, column) - low) ./ (high - low) * 100;
        else
            normalized(:, column) = (high - values(:, column)) ./ (high - low) * 100;
        end
    end
    score = normalized * weightVector(:) / sum(weightVector);
end

results = table(materials.Name, materials.UTS_MPa, proof_MPa, allowable_MPa, ...
    specificStrength, materials.E_GPa, materials.FatigueScore, ...
    materials.CorrosionScore, area_m2, mass_kg, elongation_mm, cost, carbon, score, ...
    'VariableNames', {'Name','UTS_MPa','Proof_MPa','Allowable_MPa', ...
    'SpecificStrength_MPa_m3_kg','E_GPa','FatigueScore','CorrosionScore', ...
    'Area_m2','Mass_kg','Elongation_mm','Cost','Carbon_kgCO2e','Score'});
results = sortrows(results, {'Score','UTS_MPa'}, {'descend','descend'});
end
