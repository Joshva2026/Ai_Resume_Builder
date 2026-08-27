/**
 * PDF Fallback Generator using pdf-lib (pure JavaScript)
 * Ensures resume PDF downloads succeed even in headless containers without Chrome binaries.
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generatePdfFallback(resumeContent, resumeTitle = 'Resume') {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  function checkPageBreak(requiredSpace = 40) {
    if (y - requiredSpace < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }
  }

  const p = resumeContent.personal || {};
  const fullName = p.fullName || resumeTitle || 'Resume';

  // Name
  page.drawText(fullName, {
    x: margin,
    y: y - 18,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });
  y -= 26;

  // Headline
  if (p.headline) {
    page.drawText(p.headline, {
      x: margin,
      y: y - 11,
      size: 11,
      font: fontOblique,
      color: rgb(0.3, 0.35, 0.45)
    });
    y -= 18;
  }

  // Contact Info
  const contacts = [p.email, p.phone, p.location, p.link, p.github].filter(Boolean);
  if (contacts.length > 0) {
    page.drawText(contacts.join('  |  '), {
      x: margin,
      y: y - 9,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5)
    });
    y -= 18;
  }

  // Section divider line
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.82, 0.85)
  });
  y -= 16;

  // Summary
  if (resumeContent.summary) {
    checkPageBreak(50);
    page.drawText('PROFESSIONAL SUMMARY', {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3)
    });
    y -= 16;

    const words = resumeContent.summary.split(' ');
    let line = '';
    for (const w of words) {
      const testLine = line + (line ? ' ' : '') + w;
      if (fontRegular.widthOfTextAtSize(testLine, 9.5) > (width - margin * 2)) {
        page.drawText(line, { x: margin, y: y - 9.5, size: 9.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        y -= 13;
        checkPageBreak(20);
        line = w;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y: y - 9.5, size: 9.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
    }
  }

  // Experience
  const expList = Array.isArray(resumeContent.experience) ? resumeContent.experience : [];
  if (expList.length > 0) {
    checkPageBreak(50);
    page.drawText('WORK EXPERIENCE', {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3)
    });
    y -= 16;

    for (const exp of expList) {
      checkPageBreak(40);
      const title = exp.title || exp.role || exp.position || 'Position';
      const company = exp.company || '';
      const dates = [exp.startDate || exp.start, exp.endDate || exp.end || (exp.current ? 'Present' : '')].filter(Boolean).join(' - ');

      page.drawText(`${title} - ${company}`, {
        x: margin,
        y: y - 10,
        size: 10,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.2)
      });
      if (dates) {
        const dateWidth = fontRegular.widthOfTextAtSize(dates, 9);
        page.drawText(dates, {
          x: width - margin - dateWidth,
          y: y - 10,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5)
        });
      }
      y -= 14;

      const desc = exp.description || exp.bullets || '';
      if (desc) {
        const bullets = desc.split('\n').map(b => b.trim()).filter(Boolean);
        for (const b of bullets) {
          checkPageBreak(20);
          page.drawText(`• ${b}`, {
            x: margin + 10,
            y: y - 9,
            size: 9,
            font: fontRegular,
            color: rgb(0.25, 0.25, 0.25)
          });
          y -= 13;
        }
      }
      y -= 6;
    }
  }

  // Education
  const eduList = Array.isArray(resumeContent.education) ? resumeContent.education : [];
  if (eduList.length > 0) {
    checkPageBreak(50);
    page.drawText('EDUCATION', {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3)
    });
    y -= 16;

    for (const edu of eduList) {
      checkPageBreak(30);
      const degree = edu.degree || 'Degree';
      const school = edu.school || edu.institution || 'University';
      const dates = [edu.startDate || edu.start, edu.endDate || edu.end || edu.year].filter(Boolean).join(' - ');

      page.drawText(`${degree}, ${school}`, {
        x: margin,
        y: y - 10,
        size: 9.5,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.2)
      });
      if (dates) {
        const dateWidth = fontRegular.widthOfTextAtSize(dates, 9);
        page.drawText(dates, {
          x: width - margin - dateWidth,
          y: y - 10,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5)
        });
      }
      y -= 14;
    }
  }

  // Skills
  if (resumeContent.skills) {
    checkPageBreak(40);
    page.drawText('SKILLS', {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3)
    });
    y -= 16;

    const skillsText = typeof resumeContent.skills === 'string' ? resumeContent.skills : JSON.stringify(resumeContent.skills);
    page.drawText(skillsText.slice(0, 300), {
      x: margin,
      y: y - 9.5,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= 18;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generatePdfFallback
};
