# PRISM · Spectral Optics Laboratory (Polished Edition)

A standalone Three.js experiment packaged with the independent DEVIANCE / ATELIER UI. No cross-project navigation.

## Try it

Open on [GitHub Pages](https://deviancevxxxxm.github.io/prism-optics/)

## How to run

Host the repository with GitHub Pages (root `index.html`). Or serve the folder over HTTP for local development. Open it with a modern WebGL-capable browser and internet access; Three.js is loaded from the public CDN.

## Four compositions

1. **Spectrum** — broad front-on view of the refracted spectrum and optical bench.
2. **Glass Macro** — close view of the triangular prism and internal path.
3. **Bench Survey** — elevated three-quarter shot of the instrument and the reflected light.
4. **Spectral Fan** — reverse angle looking into the outgoing colored ray fan.

## Physics vs. presentation

- Indices of refraction come from published Sellmeier coefficients for N-BK7, N-SF11 and fused silica.
- Rays are traced through the triangular cross-section using planar Snell refraction, total internal reflection and unpolarized Fresnel transmission. Wavelength samples cover 400–700 nm.
- **Measured · 1×** is the default, showing calculated outgoing ray directions.
- **Showcase · 2.5×** makes the spread visibly wider. The numeric dispersion, transmission and paths inside the prism remain calculated, not exaggerated.
- The light glow, dust, photon-like moving tracers and illuminated bench are *illustrative visual effects*, not a full wave-optics, detector calibration or 3D volumetric scattering simulation.
- When wavelengths exit through different paths after internal reflections, the single dispersion readout is replaced with **MULTI-PATH** rather than reporting a misleading angle.

## Controls

Select material, incident angle, prism rotation, display spread, glass visibility, glow and animation settings in the inspector. Use the four perspective buttons or shortcuts `1–4`. `M` toggles Measured/Showcase, `G` toggles guides, `Space` pauses, `R` resets, `H` opens the inspector, `P` captures an image, and `F` toggles fullscreen.

## Repository structure

```text
index.html
assets/
  atelier-ui.css
  atelier-ui.js
  prism-scene.js
  prism-physics.js
README.md
```

The simulator is independent of the other ATELIER scenes. `assets/atelier-ui.css` and `assets/atelier-ui.js` are local copies of the shared visual language.
