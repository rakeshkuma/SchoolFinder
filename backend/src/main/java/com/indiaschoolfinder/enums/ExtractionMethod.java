package com.indiaschoolfinder.enums;

/** How the text of a document was obtained: its PDF text layer, OCR of the page images, or not at all (a scan to transcribe). */
public enum ExtractionMethod {
    TEXT_LAYER,
    OCR,
    NONE
}
