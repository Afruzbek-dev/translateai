
import { TranslationProject } from '../types';

declare const html2pdf: any;
declare const docx: any;
declare const saveAs: any;

export const exportToPDF = async (project: TranslationProject) => {
  const element = document.getElementById('export-content');
  if (!element) return;

  // Prepare content
  element.style.display = 'block';
  element.innerHTML = `
    <div style="padding: 40px; font-family: serif;">
      <h1 style="text-align: center; font-size: 32px; margin-bottom: 10px;">${project.metadata?.title}</h1>
      <h2 style="text-align: center; font-size: 20px; color: #444; margin-bottom: 50px;">${project.metadata?.author}</h2>
      <hr style="margin-bottom: 50px;" />
      ${project.chapters
        .filter(ch => ch.status === 'completed')
        .map(ch => `
          <div style="page-break-after: always; margin-top: 30px;">
            <h3 style="font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 10px;">${ch.title}</h3>
            <div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap; margin-top: 20px;">
              ${ch.translatedText}
            </div>
          </div>
        `).join('')}
    </div>
  `;

  const opt = {
    margin: 1,
    filename: `${project.metadata?.title || 'Book'}_Uzbek.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    element.innerHTML = '';
    element.style.display = 'none';
  }
};

export const exportToDOCX = async (project: TranslationProject) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const sections = project.chapters
    .filter(ch => ch.status === 'completed')
    .flatMap(ch => [
      new Paragraph({
        text: ch.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: ch.translatedText || "",
            size: 24, // 12pt
          }),
        ],
        spacing: { line: 360 }, // 1.5 line spacing
        alignment: AlignmentType.JUSTIFIED,
      }),
      new Paragraph({ text: "", spacing: { after: 400 } }), // Spacer
    ]);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: project.metadata?.title || "Translated Book",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: project.metadata?.author || "",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 },
        }),
        ...sections,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.metadata?.title || 'Book'}_Uzbek.docx`);
};
