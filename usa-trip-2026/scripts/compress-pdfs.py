"""
Ricomprime i PDF scansionati dei documenti di viaggio.

I PDF grossi forniti dall'agenzia sono scansioni: una immagine a piena pagina da
2338px (200 DPI A4), a colori anche quando il contenuto e' nero su bianco. Sul
telefono, con dati limitati negli USA, pesano troppo. Qui vengono riportati a
~160 DPI in scala di grigio, che resta piu' che leggibile e mantiene i QR code
dei voucher perfettamente scansionabili.

I PDF che contengono testo vero (non scansioni) vengono lasciati intatti:
rasterizzarli li peggiorerebbe, sia come dimensione sia come qualita'.

Uso:  python scripts/compress-pdfs.py [--apply]
Senza --apply scrive in private-uploads-compressed/ per poter confrontare.
"""

import io
import os
import shutil
import sys

import fitz  # PyMuPDF

SRC = "private-uploads"
DST = "private-uploads-compressed"

TARGET_WIDTH_PX = 1240  # ~150 DPI su A4: nitido sul telefono, QR code al sicuro
JPEG_QUALITY = 72
SKIP_UNDER_BYTES = 400_000


def is_scanned(doc: fitz.Document) -> bool:
    """Vero se il PDF e' fatto di immagini, senza testo estraibile."""
    sample = min(3, len(doc))
    return all(len(doc[i].get_text().strip()) < 20 for i in range(sample))


def compress_pdf(src_path: str, dst_path: str) -> tuple[int, int, str]:
    before = os.path.getsize(src_path)

    if before < SKIP_UNDER_BYTES:
        shutil.copy2(src_path, dst_path)
        return before, before, "gia' leggero, lasciato intatto"

    src_doc = fitz.open(src_path)
    if not is_scanned(src_doc):
        src_doc.close()
        shutil.copy2(src_path, dst_path)
        return before, before, "ha testo vero, lasciato intatto"

    out_doc = fitz.open()
    for page in src_doc:
        rect = page.rect
        scale = (TARGET_WIDTH_PX / rect.width) if rect.width else 1.0
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csGRAY)
        img_bytes = pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)

        new_page = out_doc.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=io.BytesIO(img_bytes))

    out_doc.save(dst_path, garbage=4, deflate=True)
    out_doc.close()
    src_doc.close()

    return before, os.path.getsize(dst_path), "ricompresso"


def main() -> None:
    apply_changes = "--apply" in sys.argv
    total_before = total_after = 0

    for root, _dirs, files in os.walk(SRC):
        for name in sorted(files):
            if not name.lower().endswith(".pdf"):
                continue
            src_path = os.path.join(root, name)
            rel = os.path.relpath(src_path, SRC)
            dst_path = os.path.join(DST, rel)
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

            before, after, note = compress_pdf(src_path, dst_path)
            total_before += before
            total_after += after
            print(f"{rel}: {before/1e6:.2f} MB -> {after/1e6:.2f} MB  [{note}]")

    saving = 100 - (total_after / total_before * 100) if total_before else 0
    print(f"\nTOTALE: {total_before/1e6:.1f} MB -> {total_after/1e6:.1f} MB "
          f"(risparmio {saving:.0f}%)")

    if apply_changes:
        for root, _dirs, files in os.walk(DST):
            for name in files:
                compressed = os.path.join(root, name)
                rel = os.path.relpath(compressed, DST)
                shutil.copy2(compressed, os.path.join(SRC, rel))
        shutil.rmtree(DST)
        print("\nSostituiti gli originali in private-uploads/.")
    else:
        print(f"\nAnteprima in {DST}/. Rilancia con --apply per sostituire gli originali.")


if __name__ == "__main__":
    main()
