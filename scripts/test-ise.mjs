import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL || 'http://127.0.0.1:5173');
  const checks = await page.evaluate(async () => {
    const { parseXfyunIseResult: parse, buildIseBusiness: business, create16kResampler } = await import('/src/services/speech/xfyunIse.ts');
    const { scorePronunciation: map, speechDimensionStars } = await import('/src/services/scoring/pronunciation.ts');
    const results = [];
    const check = (name, condition) => results.push({ name, passed: Boolean(condition) });
    const sentence = (attributes, children = '') => `<xml><read_sentence><read_sentence total_score="98" ${attributes}>${children}</read_sentence></read_sentence></xml>`;
    const low = parse(sentence('accuracy_score="4" phone_score="8" tone_score="0"'));
    check('百分制4、8、0分不放大', low.accuracyScore === 4 && low.pronunciationScore === 8 && low.toneScore === 0 && map(low).scores.pronunciationClarity === 4);
    const local = parse(sentence('', '<sentence accuracy_score="99" fluency_score="99"/>'));
    check('不把子句分数当全文分数', local.accuracyScore === undefined && local.fluencyScore === undefined && !('pronunciationClarity' in map(local).scores));
    for (const [flag, kind] of [[16, '漏读'], [32, '增读'], [64, '回读'], [128, '替换']]) {
      const result = parse(sentence('accuracy_score="99"', `<syll content="花" dp_message="${flag}"><phone dp_message="${flag}" perr_msg="${flag}"/></syll>`));
      check(`${kind}不被高总分掩盖且不重复计数`, result.issues.length === 1 && result.issues[0].kind === kind && result.stars === 0 && !('pronunciationClarity' in map(result).scores));
    }
    const tone = parse(sentence('accuracy_score="99" phone_score="100" tone_score="100"', '<syll content="花"><phone dp_message="0" perr_msg="2"/></syll>'));
    check('声调错误保留为可复核证据', tone.issues[0].kind === '声调错误' && tone.reviewReasons.length > 0);
    check('单个声调错误只限制对应星级，不把声韵清空', speechDimensionStars(tone, 'toneScore') === 4 && speechDimensionStars(tone, 'pronunciationScore') === 5 && speechDimensionStars(tone, 'accuracyScore') === 4);
    for (const attr of ['is_rejected="true"', 'except_info="28673"', 'except_info="99999"']) {
      check(`拒评或异常不生成成绩 ${attr}`, !('pronunciationClarity' in map(parse(sentence(`accuracy_score="99" ${attr}`))).scores));
    }
    const missing = parse(sentence('accuracy_score=""'));
    check('空字段不变成零或总分', missing.accuracyScore === undefined && missing.reviewReasons.length > 0);
    const word = parse('<read_word total_score="98" phone_score="60" tone_score="40"/>');
    check('字词采用声韵声调较低值，不伪造准确度', word.accuracyScore === undefined && map(word).scores.pronunciationClarity === 40);
    const wordTone = parse('<read_word total_score="100" phone_score="100" tone_score="100"><syll content="苹"><phone perr_msg="2"/></syll></read_word>');
    check('字词局部声调问题保留分项星级且不冒充满分', speechDimensionStars(wordTone, 'pronunciationScore') === 5 && speechDimensionStars(wordTone, 'toneScore') === 4 && !('pronunciationClarity' in map(wordTone).scores));
    for (const raw of ['<broken>', '<read_sentence total_score="101"/>', '<read_sentence><sentence total_score="90"/></read_sentence>']) {
      let failed = false; try { parse(raw); } catch { failed = true; }
      check(`非法XML/分数/节点拒绝: ${raw}`, failed);
    }
    for (const [year, grade] of [[1, 'junior'], [2, 'junior'], [3, 'middle'], [4, 'middle'], [5, 'senior'], [6, 'senior']]) {
      const params = business({ referenceText: '花开了。', category: 'read_sentence', studentGrade: `grade-${year}` });
      check(`${year}年级参数`, params.grade === grade && params.group === 'pupil');
    }
    const params = business({ referenceText: '\uFEFF花开了。', category: 'read_sentence', studentGrade: 'kindergarten' });
    check('文本保留标点且只有一个BOM', params.text === '\uFEFF花开了。');
    check('学前年级不虚构grade', !('grade' in params));
    check('字词不发送grade', !('grade' in business({ referenceText: '花', category: 'read_syllable', studentGrade: 'grade-1' })));
    check('字词使用严格检错，句子保留普通门限', business({ referenceText: '苹果', category: 'read_word' }).check_type === 'hard' && params.check_type === 'common');
    check('音频与扩展能力参数', params.aue === 'raw' && params.auf === 'audio/L16;rate=16000' && params.check_type === 'common' && params.extra_ability === 'multi_dimension;syll_phone_err_msg');
    let emptyFailed = false; try { business({ referenceText: '   ' }); } catch { emptyFailed = true; }
    check('空题目禁止启动', emptyFailed);
    for (const rate of [16000, 44100, 48000]) {
      const resample = create16kResampler(rate);
      let count = 0; let stable = true;
      for (let offset = 0; offset < rate; offset += 4096) {
        const output = resample(new Float32Array(Math.min(4096, rate - offset)).fill(0.25));
        count += output.length;
        stable &&= Array.from(output).every((value) => Math.abs(value - 0.25) < 0.00001);
      }
      check(rate + 'Hz跨分块重采样为16000个样本且幅值不变', count === 16000 && stable);
    }
    return results;
  });
  checks.forEach((check) => assert.ok(check.passed, check.name));
  console.log(`ISE regression: ${checks.length} checks passed (synthetic XML; no paid API calls).`);
  await page.evaluate(async () => {
    const db = await import('/src/services/storage/database.ts');
    const { parseXfyunIseResult } = await import('/src/services/speech/xfyunIse.ts');
    const evidence = parseXfyunIseResult('<read_sentence total_score="99" accuracy_score="95"><syll content="花" dp_message="128"/></read_sentence>');
    await db.saveStudent({ id: 'ise-test', name: '回归测试', gender: 'other', age: 7, grade: 'grade-1', assessmentDate: '2026-10-17', recommendedStage: 'B', selectedStage: 'B' });
    for (const high of [false, true]) {
      await db.saveSession({ id: high ? 'ise-high' : 'ise-review', studentId: 'ise-test', stage: 'B', courseVersion: 3, startTime: '2026-10-17', status: 'completed', results: [{ moduleId: 'A1', questionId: 'test', status: 'completed', ...(high ? { finalScores: { pronunciationClarity: 99 } } : {}), rawResult: { scoringVersion: 'ise-evidence-v2', referenceText: '花开了。', evidence } }] });
    }
  });
  for (const id of ['ise-high', 'ise-review']) {
    await page.goto(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'}/report/${id}`);
    await page.locator('.reading-evidence').waitFor();
    assert.match(await page.locator('.reading-evidence').innerText(), /花开了/);
    assert.doesNotMatch(await page.locator('.reading-evidence').innerText(), /引擎总分|准确度：/);
  }
  console.log('Report regression: review evidence remains visible with no score and with a high teacher/summary score.');
} finally {
  await browser.close();
}
