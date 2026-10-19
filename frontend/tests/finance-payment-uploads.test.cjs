const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const cases = [
    ['FinancePayModal.tsx', 'const uploadedUrls:', 'await onConfirm', 'uploadedUrls', 'proofs'],
    ['FinancePayModal.ios.tsx', 'const uploadedUrls:', 'await onConfirm', 'uploadedUrls', 'proofs'],
    ['ConsolidationPaymentModal.ios.tsx', 'const proofUrls =', 'await payConsolidationBatch', 'proofUrls', 'proofs'],
    ['SwiftUIConsolidationRequestDetailSheet.ios.tsx', 'const uploadedInvoices =', 'const values =', 'uploadedInvoices.map(file => file.uri)', 'invoiceFiles'],
];
for (const [file, start, end, result, input] of cases) {
    test(`${file} persists temporary attachments and stops when storage fails`, async () => {
        const source = fs.readFileSync(`components/finance/${file}`, 'utf8');
        const block = source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
        let fail = false;
        let writes = 0;
        const context = { exports: {}, require: name => {
            if (name === 'react-native') return { Platform: { OS: 'web' } };
            if (name === './api/finance') return { uploadFinanceFileBase64: async () => {
                writes++;
                if (fail) throw Error('Storage rejected upload');
                return 'payment-proof/saved.pdf';
            } };
            return {};
        } };
        vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/uploadFinanceAttachment.ts', 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText, context);
        context.uploadFinanceAttachment = context.exports.uploadFinanceAttachment;
        vm.runInNewContext(ts.transpileModule(`exports.run = async (${input}) => { ${block}; return ${result}; };`, {
            compilerOptions: { target: ts.ScriptTarget.ES2020 },
        }).outputText, context);
        const files = [{ uri: 'data:application/pdf;base64,AQID', name: 'invoice.pdf' }, { uri: 'purchase/existing.pdf', name: 'Existing' }];
        assert.deepEqual(Array.from(await context.exports.run(files)), ['payment-proof/saved.pdf', 'purchase/existing.pdf']);
        assert.equal(writes, 1);
        fail = true;
        await assert.rejects(context.exports.run(files), /Storage rejected upload/);
    });
}
