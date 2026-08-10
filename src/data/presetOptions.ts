import { 
  CameraMotion, 
  LensType, 
  LightingStyle, 
  StylePreset, 
  VideoModelTarget, 
  AspectRatio 
} from '../types';

export interface OptionItem<T> {
  value: T;
  label: string;
  labelEn: string;
  desc?: string;
}

export const TARGET_MODELS: OptionItem<VideoModelTarget>[] = [
  { value: 'minimax-h3', label: 'MiniMax Hailuo H3（强物理真实感）', labelEn: 'MiniMax H3', desc: '强物理真实感、高质感人像与动作连贯度' },
  { value: 'kling-ai', label: '可灵 Kling AI（镜头控制强、长视频流畅）', labelEn: 'Kling AI 1.5', desc: '镜头控制强、长视频流畅' },
  { value: 'runway-gen3', label: 'Runway Gen-3（好莱坞质感）', labelEn: 'Runway Gen-3', desc: '好莱坞质感、微结构质感' },
  { value: 'sora', label: 'OpenAI Sora（长时序世界一致性）', labelEn: 'OpenAI Sora', desc: '长时序世界一致性' },
  { value: 'luma-dream', label: 'Luma Dream（快速三维运镜）', labelEn: 'Luma Dream', desc: '快速三维运镜与镜头感' },
  { value: 'pika-2', label: 'Pika Labs（特效转换）', labelEn: 'Pika 2.0', desc: '特效转换与角色动作控制' },
];

export const CAMERA_MOTIONS: OptionItem<CameraMotion>[] = [
  { value: 'static', label: '固定视角 (Static Shot)', labelEn: 'Static Shot', desc: '无摄像机移动，强调主体内部细腻动效' },
  { value: 'dolly_in', label: '推进镜头 (Dolly In)', labelEn: 'Dolly In', desc: '摄像机平滑向前推进，聚焦核心主体' },
  { value: 'dolly_out', label: '拉远镜头 (Dolly Out)', labelEn: 'Dolly Out', desc: '摄像机向后拉远，展现宏大环境全景' },
  { value: 'pan_left', label: '左平移 (Pan Left)', labelEn: 'Pan Left', desc: '摄像机水平向左平移视角' },
  { value: 'pan_right', label: '右平移 (Pan Right)', labelEn: 'Pan Right', desc: '摄像机水平向右平移视角' },
  { value: 'tilt_up', label: '仰角向上 (Tilt Up)', labelEn: 'Tilt Up', desc: '视角由低向高攀升，增强雄伟压迫感' },
  { value: 'tilt_down', label: '俯角向下 (Tilt Down)', labelEn: 'Tilt Down', desc: '视角由高向低俯瞰' },
  { value: 'orbit_arc', label: '360° 环绕 (Orbital Arc)', labelEn: '360° Orbit Arc', desc: '围绕主体弧形环绕旋转镜头' },
  { value: 'tracking_shot', label: '跟随追踪 (Tracking Shot)', labelEn: 'Tracking Shot', desc: '平行跟随主体移动，维持画面焦段' },
  { value: 'fpv_crane', label: '摇臂/FPV俯冲 (FPV Crane)', labelEn: 'FPV Crane', desc: '高动态穿梭视角，极具穿透力' },
  { value: 'handheld_shake', label: '手持微震 (Handheld Camera)', labelEn: 'Handheld', desc: '轻微纪实感手持呼吸感微震' },
  { value: 'zoom_in', label: '快速变焦 (Zoom In)', labelEn: 'Zoom In', desc: '光学或数字快速放大变焦' },
];

export const LENS_TYPES: OptionItem<LensType>[] = [
  { value: '35mm_anamorphic', label: '35mm 变形宽银幕', labelEn: '35mm Anamorphic', desc: '好莱坞经典宽银幕拉丝光斑' },
  { value: '85mm_portrait', label: '85mm 人像定焦 (f/1.4)', labelEn: '85mm F1.4 Portrait', desc: '极致浅景深，梦幻奶油虚化背景' },
  { value: '16mm_wide', label: '16mm 广角镜头', labelEn: '16mm Ultra-Wide', desc: '展现透视延伸感与宏伟场景' },
  { value: 'macro_lens', label: '微距镜头 (Macro 100mm)', labelEn: '100mm Macro', desc: '放大眼球、露珠、材质微观纹理' },
  { value: 'telephoto_200mm', label: '200mm 长焦镜头', labelEn: '200mm Telephoto', desc: '画面空间压缩感，拉近远景' },
  { value: 'fisheye', label: '鱼眼广角 (Fisheye)', labelEn: 'Fisheye Lens', desc: '夸张畸变与边缘透视感' },
];

export const LIGHTING_STYLES: OptionItem<LightingStyle>[] = [
  { value: 'cyberpunk_neon', label: '赛博朋克霓虹', labelEn: 'Cyberpunk Neon', desc: '高饱和洋红与青色双色交织反光' },
  { value: 'golden_hour', label: '黄金时段晨曦/逆光', labelEn: 'Golden Hour Sun', desc: '温暖发光轮廓与柔美漫反射' },
  { value: 'volumetric_rays', label: '丁达尔体积光 (God Rays)', labelEn: 'Volumetric Rays', desc: '穿透烟雾/树叶的光束通道' },
  { value: 'chiaroscuro_noir', label: '明暗对比电影黑夜', labelEn: 'Chiaroscuro Noir', desc: '高反差戏剧性光影与浓重阴影' },
  { value: 'soft_studio', label: '柔和影棚三点光', labelEn: 'Soft Studio Light', desc: '细腻均匀无无杂乱阴影的高质感光照' },
  { value: 'bioluminescent', label: '生物发光/荧光', labelEn: 'Bioluminescent Glow', desc: '水底或奇幻植物散发幽蓝绿荧光' },
  { value: 'moody_fog', label: '薄雾漫射光', labelEn: 'Moody Volumetric Fog', desc: '神秘朦胧的高级灰氛围' },
  { value: 'dramatic_rim', label: '戏剧性轮廓光', labelEn: 'Dramatic Rim Light', desc: '勾勒主体边缘的发光线条' },
];

export const ASPECT_RATIOS: OptionItem<AspectRatio>[] = [
  { value: '16:9', label: '16:9 横屏 (横屏大片/YouTube/电视)', labelEn: '16:9 Landscape' },
  { value: '9:16', label: '9:16 竖屏 (抖音/Reels/Shorts)', labelEn: '9:16 Portrait' },
  { value: '21:9', label: '21:9 超宽银幕 (影院电影格式)', labelEn: '21:9 Ultrawide' },
  { value: '1:1', label: '1:1 方形 (社交平台/Instagram)', labelEn: '1:1 Square' },
  { value: '4:3', label: '4:3 复古屏 (经典电视/胶片感)', labelEn: '4:3 Classic' },
];

// Gaven 电影感视频提示词导演的画风系统
export const DIRECTOR_STYLES: OptionItem<string>[] = [
  { value: 'D01', label: '王家卫/杜可风 霓虹都市情绪', labelEn: 'Wong Kar-wai / Doyle', desc: '人物偏置、前景遮挡、霓虹混合、潮湿反光、轻微拖影' },
  { value: 'D02', label: '韦斯·安德森 对称复古舞台', labelEn: 'Wes Anderson / Yeoman', desc: '正面机位、中央对称、粉彩有限色板、舞台化道具' },
  { value: 'D03', label: '张艺谋 东方仪式高纯度色彩', labelEn: 'Zhang Yimou', desc: '宏观秩序、重复阵列、红黑金青高纯度、仪式群体' },
  { value: 'D04', label: '诺兰 大画幅实景史诗', labelEn: 'Nolan / van Hoytema', desc: '大画幅清晰度、低机位、自然光实用光源、克制低饱和' },
  { value: 'D05', label: '维伦纽瓦 极简科幻荒原', labelEn: 'Villeneuve / Fraser', desc: '大负空间、极端尺度、沙金灰褐冷青、体积光风沙' },
  { value: 'D06', label: '罗杰·迪金斯 克制光线负空间', labelEn: 'Roger Deakins', desc: '简洁几何、精确留白、单一可信主光、细腻明暗' },
  { value: 'D07', label: '大卫·芬奇 精密暗调悬疑', labelEn: 'Fincher / Cronenweth', desc: '稳定偏心构图、低调布光、黄绿青灰、干净黑位' },
  { value: 'D08', label: '雷德利·斯科特 工业烟雾科幻', labelEn: 'Ridley Scott', desc: '层叠纵深、强前景、冷暖混合实用光、潮湿金属' },
  { value: 'D09', label: '库布里克 轴线透视心理秩序', labelEn: 'Kubrick', desc: '一点透视、严格中心、广角深焦、重复结构' },
  { value: 'D10', label: '泰伦斯·马利克 自然光诗意', labelEn: 'Malick / Lubezki', desc: '贴近广角、黄金时刻、逆光耀斑、偶发式瞬间' },
  { value: 'D11', label: '索菲亚·科波拉 柔雾青春私密', labelEn: 'Sofia Coppola', desc: '近距离观察、浅景深、柔粉奶油低反差、细颗粒' },
  { value: 'D12', label: '黑泽明 风雨黑白史诗', labelEn: 'Kurosawa', desc: '强烈景深、对角线、高反差黑白、风雨烟尘' },
  { value: 'D13', label: '侯孝贤 东方日常观察', labelEn: 'Hou Hsiao-hsien', desc: '固定中远景、门窗框景、深焦、低饱和暖灰' },
  { value: 'D14', label: '杨德昌 理性都市深焦群像', labelEn: 'Edward Yang', desc: '中远景深焦、建筑几何、多层空间、中性自然光' },
];

export const PHOTO_STYLES: OptionItem<string>[] = [
  { value: 'P01', label: '自然纪实', labelEn: 'Natural Documentary', desc: '观察式平视、真实环境光、中性肤色、克制后期' },
  { value: 'P02', label: '黄金时刻', labelEn: 'Golden Hour', desc: '低角度暖阳、长阴影、柔和轮廓光、自然耀斑' },
  { value: 'P03', label: '蓝调时刻', labelEn: 'Blue Hour', desc: '深蓝环境光、城市暖灯点缀、冷暖平衡、安静暮色' },
  { value: 'P04', label: '阴天柔光人像', labelEn: 'Overcast Soft Portrait', desc: '大面积柔光、低反差肤色、柔和阴影、低饱和背景' },
  { value: 'P05', label: '高级极简商业静物', labelEn: 'Minimal Commercial Still', desc: '简洁几何台面、大面积留白、精确轮廓光、中性色板' },
  { value: 'P06', label: '高级美妆', labelEn: 'High-end Beauty', desc: '近景特写、均匀柔光、皮肤纹理细腻、纯净背景' },
  { value: 'P07', label: '时尚硬闪', labelEn: 'Fashion Hard Flash', desc: '正面硬闪、清晰投影、高反差、杂志街拍张力' },
  { value: 'P08', label: '黑色电影', labelEn: 'Film Noir', desc: '高反差低调光、百叶窗阴影、深黑空间、烟雾层次' },
  { value: 'P09', label: '暖金贵妃夜宴风', labelEn: 'Golden Imperial Banquet', desc: '新中式幻想宫廷、暖色宫灯、琥珀金蜜糖橙、薄纱丝绸刺绣' },
  { value: 'P10', label: '暖金贵妃夜宴风02', labelEn: 'Golden Banquet V2', desc: '克制温润通透、中等偏亮曝光、低饱和暖金体系' },
];

export const CAPTURE_FILMS: OptionItem<string>[] = [
  { value: 'C01', label: 'Kodak Vision3 50D', labelEn: 'Kodak 50D', desc: '日光平衡、极细颗粒、高清晰度、自然肤色' },
  { value: 'C02', label: 'Kodak Vision3 250D', labelEn: 'Kodak 250D', desc: '日光平衡、柔和颗粒、宽容高光、自然暖肤色' },
  { value: 'C03', label: 'Kodak Vision3 200T', labelEn: 'Kodak 200T', desc: '钨丝灯平衡、细腻颗粒、暖光肤色自然、冷色清透蓝调' },
  { value: 'C04', label: 'Kodak Vision3 500T', labelEn: 'Kodak 500T', desc: '钨丝灯平衡、可见细颗粒、宽容暗部、城市混合光' },
  { value: 'C05', label: 'Kodak Portra 160', labelEn: 'Portra 160', desc: '细颗粒、奶油高光、清洁自然色彩、棚拍人像' },
  { value: 'C06', label: 'Kodak Portra 400', labelEn: 'Portra 400', desc: '自然肤色、柔和对比、通透高光、暖色克制' },
  { value: 'C07', label: 'Kodak Portra 800', labelEn: 'Portra 800', desc: '较明显颗粒、暖肤色、柔和暗部、室内黄昏夜间人像' },
  { value: 'C08', label: 'Kodak Gold 200', labelEn: 'Gold 200', desc: '阳光暖调、金黄色高光、鲜明红橙、家庭相册质感' },
  { value: 'C09', label: 'Kodak Ektar 100', labelEn: 'Ektar 100', desc: '极细颗粒、高饱和、清晰边缘、鲜明蓝绿红' },
  { value: 'C10', label: 'CineStill 800T', labelEn: 'CineStill 800T', desc: '钨丝灯平衡、夜景高感、红色灯光晕圈、青蓝暗部' },
  { value: 'C11', label: 'Fujifilm Pro 400H', labelEn: 'Pro 400H', desc: '柔和粉彩、清透绿色、偏冷阴影、低反差细腻肤色' },
  { value: 'C12', label: 'Fujifilm Velvia 50', labelEn: 'Velvia 50', desc: '高饱和高反差、浓郁绿蓝、细颗粒、通透风景' },
  { value: 'C13', label: 'Kodak Double-X 5222', labelEn: 'Double-X 5222', desc: '经典电影黑白、中等颗粒、深黑明亮高光' },
  { value: 'C14', label: 'Kodak Tri-X 400', labelEn: 'Tri-X 400', desc: '鲜明颗粒、强烈黑白对比、纪实新闻感' },
];

export const PRINT_FILMS: OptionItem<string>[] = [
  { value: 'R01', label: 'Kodak 2383 电影印片', labelEn: 'Kodak 2383', desc: '浓郁黑位、扎实影院对比、中性高光、清晰色彩分离' },
  { value: 'R02', label: 'Fujifilm 3513DI 电影正片', labelEn: 'Fujifilm 3513DI', desc: '清晰色彩分离、平衡中性灰、受控对比、细腻通透' },
];

export const STYLE_INTENSITIES: OptionItem<string>[] = [
  { value: 'S1', label: 'S1 轻度', labelEn: 'S1 Light', desc: '风格轻微体现，画面内容为主' },
  { value: 'S2', label: 'S2 标准', labelEn: 'S2 Standard', desc: '风格与画面内容平衡（默认）' },
  { value: 'S3', label: 'S3 强烈', labelEn: 'S3 Strong', desc: '风格成为主要视觉表现' },
];
