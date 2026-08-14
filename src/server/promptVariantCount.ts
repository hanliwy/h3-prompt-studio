// 从用户核心提示词中识别明确的组数要求；明确数量优先于 UI 设置，最终限制 1-5。

const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
};

const GROUP_UNITS = ['组', '套', '版', '个方案', '种方案'];

const isGroupContext = (text: string, start: number, end: number) => {
  const after = text.slice(end, end + 12);
  if (!GROUP_UNITS.some((unit) => after.startsWith(unit))) return false;
  const before = text.slice(Math.max(0, start - 4), start);
  // “第N组”“共N组”“各N组”“给我N组”等明确指示；避免“3个人”“5秒”误判
  return /给|出|要|共|分|各|第|来|做|写|生成|提供|输出|需要/.test(before) || after.startsWith('组提示词') || after.startsWith('组方案');
};

export const parseUserVariantCount = (promptText: string): number | null => {
  if (!promptText) return null;
  // 阿拉伯数字（1-5），需处于明确的组数上下文
  const arabicPattern = /(\d)/g;
  let match: RegExpExecArray | null;
  while ((match = arabicPattern.exec(promptText)) !== null) {
    const value = Number(match[1]);
    if (value >= 1 && value <= 5 && isGroupContext(promptText, match.index, match.index + 1)) {
      return value;
    }
  }
  // 中文数字（一至五）
  for (const [word, value] of Object.entries(CHINESE_NUMBERS)) {
    let index = 0;
    while ((index = promptText.indexOf(word, index)) !== -1) {
      if (isGroupContext(promptText, index, index + word.length)) return value;
      index += word.length;
    }
  }
  return null;
};

// UI 组数为默认，用户文本明确数量覆盖；始终限制 1-5
export const resolveEffectiveVariantCount = (
  uiVariantCount: number,
  promptText: string,
): { count: number; userOverride: boolean } => {
  const userCount = parseUserVariantCount(promptText);
  const clampedUi = Math.max(1, Math.min(5, Number(uiVariantCount) || 1));
  if (userCount !== null) return { count: userCount, userOverride: userCount !== clampedUi };
  return { count: clampedUi, userOverride: false };
};
