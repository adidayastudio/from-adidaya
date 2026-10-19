const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), { renderToString } = require('react-dom/server');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), path = require('node:path');
const View = React.forwardRef((props, ref) => React.createElement('div', { ref }, props.children));
const Text = props => React.createElement('span', null, props.children);
const TextInput = props => React.createElement('input', { value: props.value, readOnly: !props.editable, onChange: () => {} });
const passthrough = props => React.createElement(View, null, props.children);
const empty = () => null;
const mocks = { react: React, 'react-dom': require('react-dom'), 'react-native': { View, Text, TextInput, TouchableOpacity: View, Platform: { OS: 'web' } }, '@expo/vector-icons': { Ionicons: empty }, '@/components/ui/PlatformContextMenu': { default: passthrough, __esModule: true }, '@/components/ui/PlatformIcon': { PlatformIcon: empty }, '@/components/ui/SegmentedControl': { SegmentedControl: empty }, '@/components/ui/DynamicIslandToastHUD': { DynamicIslandToastHUD: empty }, './setup/ProjectSaveFeedback': { useProjectSaveFeedback: () => ({ clear() {}, notify() {}, failed: false }), ProjectSaveFeedback: empty }, '@/lib/projectVolume': { volumeId: () => 'uuid' }, '@/lib/projectWBSHierarchy': { missingLegacyWBS: () => [] }, '@/lib/api/projectWBSWorkflow': { persistWBSWorkflow: async () => {} } };
const cache = {};
function load(file) {
 file = path.resolve(file); if (cache[file]) return cache[file]; const exports = {}; cache[file] = exports;
 function req(name) { if (name in mocks) return mocks[name]; const target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name); return load(target + '.ts' + (fs.existsSync(target + '.tsx') ? 'x' : '')); }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, { exports, require: req, setTimeout, clearTimeout }); return exports;
}
const { ProjectWBSEditor } = load('components/projects/ProjectWBSEditor.tsx');
const items = [{ id: 's', wbs_code: 'S', title: 'Structure (Struktur)', level: 0 }];
test('public WBS component renders the template without Component-is-not-a-function error', () => {
 assert.equal(typeof ProjectWBSEditor, 'function'); const html = renderToString(React.createElement(ProjectWBSEditor, { project: { id: 'p', meta: {} }, items, isDark: false })); assert.ok(html.includes('WBS Template')); assert.ok(html.includes('Save')); assert.ok(html.includes('Structure')); assert.ok(!html.includes('Submit WBS</span>'));
});
test('submitted version renders locked with Add Revision instead of Save', () => {
 const html = renderToString(React.createElement(ProjectWBSEditor, { project: { id: 'p', meta: { wbsWorkflow: { draft: null, versions: [{ version: 1, items }] } } }, items, isDark: false })); assert.ok(html.includes('WBS v.1')); assert.ok(!html.includes('>Save</span>')); assert.ok(html.includes('readOnly'));
});

test('tooltip appears immediately on hover and disappears on leave', () => {
 let anchor = null;
 const shim = { ...React, useId: () => 'tip', useState: () => [anchor, next => { anchor = next; }] };
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/ui/InstantTooltip.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, require: name => name === 'react' ? shim : name === 'react-native' ? { Platform: { OS: 'web' } } : { createPortal: element => element }, window: { innerWidth: 1000 }, document: { body: {} } });
 let view = exports.InstantTooltip({ label: 'Undo', children: 'button' });
 view.props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ left: 300, width: 40, bottom: 100 }) } });
 view = exports.InstantTooltip({ label: 'Undo', children: 'button' });
 const tip = view.props.children[1]; assert.equal(tip.props.role, 'tooltip'); assert.equal(tip.props.children, 'Undo'); assert.equal(tip.props.style.top, 107);
 view.props.onMouseLeave(); assert.equal(anchor, null);
});
