/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from 'chai';
import * as path from 'path';
import {Analyzer, applyEdits, FSUrlLoader, makeParseLoader} from 'polymer-analyzer';

import {Linter} from '../../linter';
import {registry} from '../../registry';
import {WarningPrettyPrinter} from '../util';

const fixtures_dir = path.join(__dirname, '..', '..', '..', 'test');

const ruleId = 'content-to-slot-usages';

suite(ruleId, () => {
  let analyzer: Analyzer;
  let warningPrinter: WarningPrettyPrinter;
  let linter: Linter;

  setup(() => {
    analyzer = new Analyzer({urlLoader: new FSUrlLoader(fixtures_dir)});
    warningPrinter = new WarningPrettyPrinter();
    linter = new Linter(registry.getRules([ruleId]), analyzer);
  });

  test('works in the trivial case', async() => {
    const warnings = await linter.lint([]);
    assert.deepEqual([...warnings], []);
  });

  test('warns for the proper cases and with the right messages', async() => {
    const warnings = await linter.lint([`${ruleId}/${ruleId}.html`]);
    assert.deepEqual(warningPrinter.prettyPrint(warnings), [
      `
    <slot name="foo" old-content-selector="!)@#(*(@!#*"></slot>
                                          ~~~~~~~~~~~~~`,
      `
    <slot name="bar" old-content-selector=".bar .baz"></slot>
                                          ~~~~~~~~~~~`,
      `
    <slot name="bar" old-content-selector=".bar > .baz"></slot>
                                          ~~~~~~~~~~~~~`
    ]);

    assert.deepEqual(warnings.map((w) => w.message), [
      'Unmatched selector: !)@#(*(@!#*',
      'Unsupported CSS operator: descendant',
      'Unsupported CSS operator: child'
    ]);
  });

  test('applies automatic-safe fixes', async() => {
    const warnings = await linter.lint([`${ruleId}/before-fixes.html`]);
    const edits = warnings.filter((w) => w.fix).map((w) => w.fix!);
    const loader = makeParseLoader(analyzer, warnings.analysis);
    const result = await applyEdits(edits, loader);
    assert.deepEqual(
        result.editedFiles.get(`${ruleId}/before-fixes.html`),
        (await loader(`${ruleId}/after-fixes.html`)).contents);
  });
});
