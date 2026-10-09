import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFStream } from "pdf-lib";

/**
 * PDF/A-3b-Nachbesserung für ZUGFeRD-PDFs (node-zugferd 0.1.x schreibt eine XMP-Metadaten, die veraPDF
 * nicht parsen kann, und ein ICC-Profil ohne /N). Ersetzt die Metadaten durch ein wohlgeformtes XMP
 * (PDF/A-ID + Factur-X-Erweiterungsschema), gleicht das Info-Dictionary ab und setzt /N am ICC-Profil.
 */
export interface PdfaMeta {
  title: string;
  author: string;
  subject: string;
  /** Factur-X: Dateiname der eingebetteten XML, Profil (z. B. "EN 16931"), Version. */
  facturX: { documentFileName: string; conformanceLevel: string; version: string; documentType?: string };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function xmp(m: PdfaMeta, datum: Date): string {
  const fx = m.facturX;
  const prop = (name: string, desc: string) => `
              <rdf:li rdf:parseType="Resource">
                <pdfaProperty:name>${name}</pdfaProperty:name>
                <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                <pdfaProperty:category>external</pdfaProperty:category>
                <pdfaProperty:description>${desc}</pdfaProperty:description>
              </rdf:li>`;
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.title)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>${esc(m.author)}</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.subject)}</rdf:li></rdf:Alt></dc:description>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>Nik Huber Guitars App</xmp:CreatorTool>
      <xmp:CreateDate>${iso(datum)}</xmp:CreateDate>
      <xmp:ModifyDate>${iso(datum)}</xmp:ModifyDate>
      <xmp:MetadataDate>${iso(datum)}</xmp:MetadataDate>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>Nik Huber Guitars App</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>${prop("DocumentFileName", "name of the embedded XML invoice file")}${prop("DocumentType", "INVOICE")}${prop("Version", "The actual version of the Factur-X XML schema")}${prop("ConformanceLevel", "The conformance level of the embedded Factur-X data")}
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>${esc(fx.documentType ?? "INVOICE")}</fx:DocumentType>
      <fx:DocumentFileName>${esc(fx.documentFileName)}</fx:DocumentFileName>
      <fx:Version>${esc(fx.version)}</fx:Version>
      <fx:ConformanceLevel>${esc(fx.conformanceLevel)}</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function pdfaNachbessern(bytes: Uint8Array, m: PdfaMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const datum = new Date(Math.floor(Date.now() / 1000) * 1000); // sekundengenau (Info ↔ XMP identisch)

  // Info-Dictionary = XMP
  doc.setTitle(m.title);
  doc.setAuthor(m.author);
  doc.setSubject(m.subject);
  doc.setCreator("Nik Huber Guitars App");
  doc.setProducer("Nik Huber Guitars App");
  doc.setCreationDate(datum);
  doc.setModificationDate(datum);

  // Metadaten-Stream ersetzen (unkomprimiert, wie von PDF/A verlangt)
  const meta = doc.context.stream(new TextEncoder().encode(xmp(m, datum)), {
    Type: "Metadata",
    Subtype: "XML",
  });
  doc.catalog.set(PDFName.of("Metadata"), doc.context.register(meta));

  // ICC-Profil des OutputIntents: /N 3 (RGB)
  const intents = doc.catalog.lookupMaybe(PDFName.of("OutputIntents"), PDFArray);
  for (const ref of intents?.asArray() ?? []) {
    const oi = doc.context.lookup(ref);
    const profRef = oi instanceof PDFDict ? oi.get(PDFName.of("DestOutputProfile")) : undefined;
    const prof = profRef ? doc.context.lookup(profRef) : undefined;
    if (prof instanceof PDFStream) prof.dict.set(PDFName.of("N"), PDFNumber.of(3));
  }

  return doc.save({ updateFieldAppearances: false });
}
