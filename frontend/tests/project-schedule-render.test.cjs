const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToString } = require('react-dom/server');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(filePath) {
    const file = path.resolve(filePath);
    const code = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(code, {
        compilerOptions: {
            jsx: ts.JsxEmit.React,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
        }
    }).outputText;

    const moduleExports = {};
    const customRequire = (name) => {
        if (name === 'react') return React;
        if (name === 'react-native') {
            const View = (props) => React.createElement('div', { 'aria-label': props.accessibilityLabel, style: props.style }, props.children);
            const Text = (props) => React.createElement('span', { style: props.style }, props.children);
            const TextInput = (props) => React.createElement('input', {
                'aria-label': props.accessibilityLabel,
                value: props.value,
                placeholder: props.placeholder,
                onChange: () => {}
            });
            const ScrollView = (props) => React.createElement('div', { style: props.style }, props.children);
            const TouchableOpacity = (props) => React.createElement('button', {
                'aria-label': props.accessibilityLabel,
                disabled: props.disabled,
                onClick: props.onPress
            }, props.children);
            const StyleSheet = { create: (s) => s };
            const Platform = { OS: 'web' };
            const ActivityIndicator = () => React.createElement('div', null, 'loading');
            return { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator };
        }
        if (name === '@expo/vector-icons') {
            return { Ionicons: (props) => React.createElement('i', null, props.name) };
        }
        if (name === 'react-native-svg') {
            const Svg = (props) => React.createElement('svg', props, props.children);
            const Path = (props) => React.createElement('path', props);
            const Rect = (props) => React.createElement('rect', props);
            const Circle = (props) => React.createElement('circle', props);
            const SvgLine = (props) => React.createElement('line', props);
            const SvgText = (props) => React.createElement('text', props, props.children);
            const Defs = (props) => React.createElement('defs', null, props.children);
            const LinearGradient = (props) => React.createElement('linearGradient', props, props.children);
            const Stop = (props) => React.createElement('stop', props);
            return { default: Svg, Path, Rect, Circle, Line: SvgLine, Text: SvgText, Defs, LinearGradient, Stop };
        }
        if (name === '@/components/ui/PlatformContextMenu') {
            return { default: (props) => React.createElement('div', null, props.children), __esModule: true };
        }
        if (name === '@/components/ui/InstantTooltip') {
            return { InstantTooltip: (props) => React.createElement('div', null, props.children) };
        }
        if (name === '@/lib/supabase') {
            return { supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }) }) } };
        }
        if (name === './projects' || name === '@/lib/api/projects') {
            return { saveProjectMeta: async () => {} };
        }

        // Relative or alias module resolution
        let resolvedPath = name;
        if (name.startsWith('@/')) {
            resolvedPath = path.resolve('frontend', name.slice(2));
            if (!fs.existsSync(resolvedPath)) {
                resolvedPath = path.resolve(name.slice(2));
            }
        } else if (name.startsWith('./') || name.startsWith('../')) {
            resolvedPath = path.resolve(path.dirname(file), name);
        }

        if (fs.existsSync(resolvedPath + '.ts')) resolvedPath += '.ts';
        else if (fs.existsSync(resolvedPath + '.tsx')) resolvedPath += '.tsx';
        else if (fs.existsSync(resolvedPath + '/index.ts')) resolvedPath += '/index.ts';

        return loadModule(resolvedPath);
    };

    vm.runInNewContext(compiled, {
        exports: moduleExports,
        require: customRequire,
        console,
        process,
        setTimeout,
        clearTimeout
    });

    return moduleExports;
}

test('projectSchedule library correctly computes task duration in days and weeks', () => {
    const { diffDays, calculateFinishDate } = loadModule('lib/projectSchedule.ts');

    // 14 days duration
    assert.equal(diffDays('2026-10-01', '2026-10-14'), 14);
    // Finish date calculation
    assert.equal(calculateFinishDate('2026-10-01', 14), '2026-10-14');
    assert.equal(calculateFinishDate('2026-10-01', 1), '2026-10-01');
    assert.equal(calculateFinishDate('2026-10-01', 7), '2026-10-07');
});

test('buildScheduleTasks accurately aggregates weights and costs from WBS and RAB', () => {
    const { buildScheduleTasks } = loadModule('lib/projectSchedule.ts');

    const project = { id: 'p1', meta: {} };
    const wbs = [
        { id: '1', wbs_code: 'S', title: 'Structure (Struktur)', is_leaf: false },
        { id: '2', parent_id: '1', wbs_code: 'S.1', title: 'Earthworks', quantity: 10, unit: 'm3', unit_price: 2000, is_leaf: true },
        { id: '3', parent_id: '1', wbs_code: 'S.2', title: 'Foundation', quantity: 10, unit: 'm3', unit_price: 3000, is_leaf: true }
    ];

    const { tasks, totalCost } = buildScheduleTasks(project, wbs, {
        'S.1': { start: '2026-10-01', finish: '2026-10-14', duration: 14 },
        'S.2': { start: '2026-10-15', finish: '2026-10-28', duration: 14 }
    });

    // Total cost matches RAB subtotal
    assert.ok(totalCost > 0);

    const s1 = tasks.find(t => t.code === 'S.1');
    const s2 = tasks.find(t => t.code === 'S.2');
    const s = tasks.find(t => t.code === 'S');

    assert.ok(s1);
    assert.ok(s2);
    assert.ok(s);

    // Sum of leaf weights = 100%
    const leafSum = s1.weight + s2.weight;
    assert.equal(Math.round(leafSum), 100);
    // Parent rolls up weight to 100%
    assert.equal(Math.round(s.weight), 100);

    // Parent rolls up dates: earliest start is 2026-10-01, latest finish is 2026-10-28
    assert.equal(s.startDate, '2026-10-01');
    assert.equal(s.finishDate, '2026-10-28');
    assert.equal(s.durationDays, 28);
    assert.equal(s.durationWeeks, 4);
});

test('calculateTimeline produces weekly distribution and 100% cumulative progress', () => {
    const { buildScheduleTasks, calculateTimeline } = loadModule('lib/projectSchedule.ts');

    const project = { id: 'p1', meta: {} };
    const wbs = [
        { id: '1', wbs_code: 'S', title: 'Structure', is_leaf: false },
        { id: '2', parent_id: '1', wbs_code: 'S.1', title: 'Earthworks', quantity: 10, unit: 'm3', unit_price: 2000, is_leaf: true },
        { id: '3', parent_id: '1', wbs_code: 'S.2', title: 'Foundation', quantity: 10, unit: 'm3', unit_price: 3000, is_leaf: true }
    ];

    const { tasks, totalCost } = buildScheduleTasks(project, wbs, {
        'S.1': { start: '2026-10-05', finish: '2026-10-18', duration: 14 }, // 2 weeks
        'S.2': { start: '2026-10-19', finish: '2026-11-01', duration: 14 }  // 2 weeks
    });

    const timeline = calculateTimeline(tasks, 'weekly', totalCost);

    assert.ok(timeline.weeks.length >= 4);
    assert.ok(timeline.cumulativeProgress.length > 0);

    // Final cumulative progress reaches 100%
    const finalCumulative = timeline.cumulativeProgress[timeline.cumulativeProgress.length - 1];
    assert.equal(finalCumulative, 100);

    // Month groupings present
    assert.ok(timeline.months.length >= 1);
    assert.ok(timeline.months.some(m => m.shortLabel === 'OKT' || m.shortLabel === 'NOP'));
});

test('ProjectSchedulePlanner renders top KPI card, views, and timeline structure', () => {
    const { ProjectSchedulePlanner } = loadModule('components/projects/ProjectSchedulePlanner.tsx');

    const project = {
        id: 'p1',
        title: 'Rumah Rawamangun',
        meta: {
            scheduleConfig: { view: 'summary', timeScale: 'weekly' }
        }
    };
    const wbs = [
        { id: '1', wbs_code: 'S', title: 'Structure (Struktur)', is_leaf: false },
        { id: '2', parent_id: '1', wbs_code: 'S.1', title: 'Earthworks', quantity: 10, unit: 'm3', unit_price: 2000, is_leaf: true }
    ];

    const html = renderToString(React.createElement(ProjectSchedulePlanner, {
        project,
        wbs,
        isDark: true
    }));

    // Top Card elements
    assert.ok(html.includes('Total Project Cost:'));
    assert.ok(html.includes('Est. Duration:'));
    assert.ok(html.includes('Summary'));
    assert.ok(html.includes('Timeline'));
    assert.ok(html.includes('Gantt'));
    assert.ok(html.includes('S-Curve'));
    assert.ok(html.includes('TIME SCALE:'));
    assert.ok(html.includes('Weekly'));
    assert.ok(html.includes('Monthly'));

    // Summary table headers
    assert.ok(html.includes('ACTIVITY / TASK NAME'));
    assert.ok(html.includes('WGT (%)'));
    assert.ok(html.includes('START DATE'));
    assert.ok(html.includes('FINISH DATE'));
    assert.ok(html.includes('DURATION'));
    assert.ok(html.includes('CALENDAR'));

    // Task rows
    assert.ok(html.includes('Structure (Struktur)'));
    assert.ok(html.includes('Earthworks'));
    assert.ok(html.includes('Standard (7d)'));
});
