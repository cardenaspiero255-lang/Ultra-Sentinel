'use strict';

const fs = require('node:fs');
const { analyzeFamilies } = require('../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const { safeRelativePath } = require('./verify-structure.cjs');

function readCoreReport(filename) {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw Error('Invalid input file');
    const bytes = Buffer.alloc(stat.size + 1);
    const read = fs.readSync(fd, bytes, 0, bytes.length, 0);
    if (read !== stat.size) throw Error('Input file changed during report export');
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, read));
      return JSON.parse(text);
    } catch {
      throw Error('Invalid Core JSON input');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function buildReport(analysis) {
  const summary = analyzeFamilies(analysis);
  if (typeof analysis.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(analysis.version)) {
    throw Error('Invalid Core version');
  }
  const findings = analysis.findings.map(({ rule, severity, confidence, path, line }) => {
    if (!safeRelativePath(path)) throw Error('Invalid report path');
    return { rule, severity, confidence, path, line };
  });
  const { returned, analyzed, partial } = summary.coverage;
  return {
    schema: 'ultra-sentinel-frontier-report/v1',
    sha: summary.sha,
    engineVersion: analysis.version,
    generatedAt: new Date().toISOString(),
    status: summary.status,
    coverage: { returned, analyzed, partial },
    omitted: summary.omitted,
    findings,
    evidenceAuthenticated: false,
    mergeAllowed: false,
  };
}

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escape = value => String(value).replace(/[&<>]/g, character => entities[character]);

function renderHtml(report) {
  const rows = report.findings.map(finding =>
    '<tr>' + [finding.severity, finding.rule, finding.path, finding.line, finding.confidence]
      .map(value => '<td>' + escape(value) + '</td>').join('') + '</tr>');
  return [
    '<!doctype html><html lang="es"><head><meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;">',
    '<title>Ultra Sentinel Frontier</title></head><body>',
    '<h1>Ultra Sentinel Frontier</h1>',
    '<p>Estado <strong>' + escape(report.status) + '</strong> · revisión técnica preliminar</p>',
    '<p>Commit <code>' + escape(report.sha) + '</code> · Core ' + escape(report.engineVersion) +
      ' · ' + escape(report.generatedAt) + '</p>',
    '<p>Archivos analizados ' + report.coverage.analyzed + ' de ' + report.coverage.returned +
      ' · hallazgos omitidos ' + report.omitted + '</p>',
    '<table><thead><tr><th>Severidad</th><th>Regla</th><th>Archivo</th><th>Línea</th><th>Confianza</th></tr></thead>',
    '<tbody>', ...rows, '</tbody></table></body></html>',
  ].join('\n');
}

try {
  const [format, filename] = process.argv.slice(2);
  if (process.argv.length !== 4 || !['html', 'json'].includes(format)) {
    throw Error('Usage: export-frontier-report.cjs html|json core-report.json');
  }
  const report = buildReport(readCoreReport(filename));
  process.stdout.write((format === 'json' ? JSON.stringify(report, null, 2) : renderHtml(report)) + '\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
