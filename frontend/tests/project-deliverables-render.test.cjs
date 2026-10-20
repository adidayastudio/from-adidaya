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
            const Modal = (props) => props.visible ? React.createElement('div', { 'data-modal': true }, props.children) : null;
            const StyleSheet = { create: (s) => s };
            const Platform = { OS: 'web' };
            const ActivityIndicator = () => React.createElement('div', null, 'loading');
            return { View, Text, TextInput, ScrollView, TouchableOpacity, Modal, StyleSheet, Platform, ActivityIndicator };
        }
        if (name === '@expo/vector-icons') {
            return { Ionicons: (props) => React.createElement('i', null, props.name) };
        }
        if (name.includes('supabase')) {
            return {
                createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }), update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {} }) }) }) }) }) }),
                supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }), update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {} }) }) }) }) }) }
            };
        }
        if (name === '@react-native-async-storage/async-storage') {
            return { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
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

test('projectDeliverables correctly loads stage definitions and calculates progress', () => {
    const { getProjectStageList, calculateDeliverablesProgress } = loadModule('lib/projectDeliverables.ts');

    const stages = getProjectStageList({});
    assert.equal(stages.length, 7);
    assert.equal(stages[0].code, '01-KO');
    assert.equal(stages[0].name, 'Kickoff');
    assert.equal(stages[1].code, '02-SD');

    // Test with mock completed tasks
    const progress = calculateDeliverablesProgress(stages, {
        '01-KO': {
            completedSections: {
                'KO-01': true,
                'KO-02': true
            }
        }
    });

    assert.ok(progress.completedItemsCount >= 2);
    assert.ok(progress.totalItemsCount > 0);
    assert.ok(progress.overallPercent >= 0);
});

test('ProjectDeliverablesDashboard renders KPI cards and stage accordions matching screenshot 2', () => {
    const { ProjectDeliverablesDashboard } = loadModule('components/projects/deliverables/ProjectDeliverablesDashboard.tsx');

    const project = {
        id: 'p1',
        title: 'Rumah Rawamangun',
        meta: {}
    };

    const html = renderToString(React.createElement(ProjectDeliverablesDashboard, {
        project,
        isDark: false,
        onOpenStageEditor: () => {}
    }));

    // Top KPI cards
    assert.ok(html.includes('Overall Deliverables Progress'));
    assert.ok(html.includes('Active Deliverable Stage'));
    assert.ok(html.includes('Sub-deliverables Items'));

    // Stage Accordion
    assert.ok(html.includes('01-KO'));
    assert.ok(html.includes('Kickoff'));
    assert.ok(html.includes('Edit'));

    // Sub-deliverable pill cards
    assert.ok(html.includes('General Information'));
    assert.ok(html.includes('Client Brief &amp; Objectives') || html.includes('Client Brief & Objectives'));
});

test('ProjectStageDeliverableEditor renders booklet canvas and table of contents matching screenshot 3', () => {
    const { ProjectStageDeliverableEditor } = loadModule('components/projects/deliverables/ProjectStageDeliverableEditor.tsx');

    const project = {
        id: 'p1',
        number: '008',
        code: 'RWM',
        title: 'Rumah Rawamangun',
        meta: {}
    };

    const html = renderToString(React.createElement(ProjectStageDeliverableEditor, {
        project,
        stageCode: '01-KO',
        isDark: false,
        onBack: () => {}
    }));

    // Top Bar
    console.log('HTML SAMPLE:', html.slice(0, 400));
    assert.ok(html.includes('01-KO'));
    assert.ok(html.includes('Kickoff'));
    assert.ok(html.includes('Export'));
    assert.ok(html.includes('Save'));

    // Tabs
    assert.ok(html.includes('General Information'));

    // Auto-Generate Index
    assert.ok(html.includes('AUTO-GENERATE INDEX'));
    assert.ok(html.includes('Table of contents is up to date'));

    // Document Paper Sheet
    assert.ok(html.includes('#008-RWM'));
    assert.ok(html.includes('Rumah Rawamangun'));
    assert.ok(html.includes('Single Page'));
    assert.ok(html.includes('All Pages'));
});

test('ProjectWBSTracking renders English progress heading, construction/payment KPIs and WBS input', () => {
    const { ProjectWBSTracking } = loadModule('components/projects/tracking/ProjectWBSTracking.tsx');

    const project = {
        id: 'p1',
        title: 'Rumah Rawamangun',
        meta: {}
    };

    const wbs = [
        { id: '1', wbs_code: 'S', title: 'Structure (Struktur)', is_leaf: false },
        { id: '2', parent_id: '1', wbs_code: 'S.1', title: 'Preparation (Persiapan)', is_leaf: false },
        { id: '3', parent_id: '2', wbs_code: 'S.1.1', title: 'Surveying & Setting Out', quantity: 10, unit: 'm1', unit_price: 15000, is_leaf: true }
    ];

    const html = renderToString(React.createElement(ProjectWBSTracking, {
        project,
        wbs,
        isDark: false
    }));

    // Header title and KPIs
    assert.ok(html.includes('Work Progress'));
    assert.ok(!html.includes('DESIGN'));
    assert.ok(html.includes('CONST.'));
    assert.ok(html.includes('PAID'));

    // Items and Input button
    assert.ok(html.includes('S.1.1'));
    assert.ok(html.includes('Surveying &amp; Setting Out') || html.includes('Surveying & Setting Out'));
    assert.ok(html.includes('+ Input'));
});
