"""
Genera los efectos de sonido del proyecto por síntesis (solo librería estándar de Python).
Así no dependemos de descargas externas ni de licencias de terceros.

    python scripts/generar_audio.py

Crea en public/assets/audio/ (nombres en minúsculas y sin espacios, como pide la guía de clase):
    agua_fuente.wav  bucle de agua para el PositionalAudio de la fuente
    puerta.wav       campanita de puerta (entrar/salir de un edificio)
    campanitas.wav   arpegio al entrar al parque (trigger AABB)
    click.wav        clic suave al interactuar
    burbuja.wav      gota/burbuja al llegar a la fuente (trigger radial)
"""

import math
import os
import random
import struct
import wave

RATE = 22050
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "audio")


def save(name, samples):
    os.makedirs(OUT, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.85 / peak
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * gain)) * 32767)) for s in samples))
    print(f"[ok] {name:<16} {len(samples) / RATE:.2f} s  {os.path.getsize(path) // 1024} KB")


def bell(freq, dur, decay=4.0, partials=((1, 1.0), (2.01, 0.45), (3.02, 0.22), (4.2, 0.1))):
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.exp(-decay * t) * min(1.0, t * 400)
        out.append(env * sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in partials))
    return out


def mix(*tracks, offsets=None):
    offsets = offsets or [0] * len(tracks)
    length = max(int(o * RATE) + len(t) for t, o in zip(tracks, offsets))
    out = [0.0] * length
    for track, off in zip(tracks, offsets):
        start = int(off * RATE)
        for i, s in enumerate(track):
            out[start + i] += s
    return out


def water_loop(dur=4.0):
    """Ruido filtrado (agua corriendo) + gotas aleatorias, con cruce suave para que el bucle no se note."""
    rng = random.Random(7)
    n = int(dur * RATE)
    fade = int(0.5 * RATE)
    total = n + fade
    noise = []
    lp1 = lp2 = 0.0
    for _ in range(total):
        white = rng.uniform(-1, 1)
        lp1 += 0.18 * (white - lp1)  # paso bajo: rumor
        lp2 += 0.6 * (white - lp2)  # más agudo: salpicadura
        noise.append(lp1 * 0.9 + (lp2 - lp1) * 0.25)
    # Gotas: senos cortos con barrido de frecuencia
    for _ in range(int(dur * 9)):
        start = rng.randrange(0, total - 2000)
        f0 = rng.uniform(700, 1600)
        length = rng.randint(500, 1100)
        amp = rng.uniform(0.15, 0.4)
        for i in range(length):
            t = i / RATE
            env = math.exp(-t * 60)
            noise[start + i] += amp * env * math.sin(2 * math.pi * (f0 + 2500 * t) * t)
    # Cruce del final con el inicio
    out = noise[:n]
    for i in range(fade):
        k = i / fade
        out[i] = out[i] * k + noise[n + i] * (1 - k)
    return out


def click():
    n = int(0.07 * RATE)
    return [math.exp(-i / RATE * 70) * math.sin(2 * math.pi * (900 - 4000 * i / RATE) * i / RATE) for i in range(n)]


def bubble():
    n = int(0.35 * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        out.append(math.exp(-t * 12) * math.sin(2 * math.pi * (420 + 900 * t) * t))
    return out


def main():
    save("agua_fuente.wav", water_loop())
    save("puerta.wav", mix(bell(1318.5, 1.3, 3.2), bell(1046.5, 1.4, 3.0), offsets=[0, 0.12]))
    save("campanitas.wav", mix(bell(784, 1.2), bell(988, 1.2), bell(1175, 1.4), bell(1568, 1.6, 3.0), offsets=[0, 0.12, 0.24, 0.38]))
    save("click.wav", click())
    save("burbuja.wav", mix(bubble(), bubble(), offsets=[0, 0.09]))


if __name__ == "__main__":
    main()
