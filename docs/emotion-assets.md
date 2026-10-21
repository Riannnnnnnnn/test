# 表情模仿素材

运行时目录：`public/assets/v3/emotions/`。男孩使用 `boy-*-half.webp`，女孩使用 `girl-*-half.webp`（半身像）。四种表情分别为 `happy`、`sad`、`shy`、`angry`。

男孩开心直接使用用户提供的透明 WebP 参考图。其余素材使用内置 imagegen 参考图编辑模式生成，保留透明背景；未调用外部 API。女孩后三种表情以生成的开心女孩为人物参考。害羞最终采用第二版，旧版不进入运行时素材。

网站格式：720 × 900 像素以内，WebP quality 82、alphaQuality 90、effort 6；保留透明度，不拉伸。全部八张合计约 604 KB。

## 最终生成提示词

男孩难过：
> Edit attached boy into SAME IDENTICAL 3D cartoon character looking SAD. Preserve face, brown swept hair, big brown eyes, blue varsity jacket/yellow star, blue backpack and pants. Clearly sad: drooping eyebrows, downcast eyes, small downturned mouth, slumped shoulders, hands low. Child friendly, one full-body character, centered with margins, transparent background, no lettering or props.

男孩生气：
> Edit attached boy into same identical 3D cartoon character feeling ANGRY. Preserve face, swept brown hair, blue varsity jacket with yellow star, backpack and pants. Clear child-friendly anger: furrowed brows, puffed cheeks, small frown, hands on hips. Not scary or violent. Full body, centered, transparent background, no words, no props.

女孩开心：
> Create a GIRL counterpart to the attached boy character for a children's educational website. Match the exact polished soft 3D cartoon visual language, age, proportions, big warm brown eyes, rosy cheeks, lighting, blue varsity jacket with yellow star, blue backpack and blue pants. Give her distinct girl identity with medium-long brown hair in two playful low pigtails. She is HAPPY: open joyful smile and friendly waving pose. One full-body character centered with safe margins, isolated on a fully transparent background. No text, no frame, no props, no other character.

女孩难过：
> Edit attached girl into same identical 3D cartoon character feeling SAD. Preserve face, twin brown pigtails, big brown eyes, blue varsity jacket with yellow star, backpack and pants. Drooping eyebrows, downcast eyes, small downturned mouth, gentle slumped shoulders, hands low. Friendly and empathetic, full body, centered, transparent background, no text or props.

女孩生气：
> Edit attached girl into same identical 3D cartoon character feeling ANGRY. Preserve face, twin brown pigtails, big brown eyes, blue varsity jacket with yellow star, backpack and pants. Clear child-friendly anger: furrowed brows, puffed cheeks, small frown, hands on hips. Not scary or violent. Full body, centered, transparent background, no text or props.

男孩害羞第二版：
> Edit attached boy to show unmistakable SHY / EMBARRASSED emotion for preschool learning. SAME boy identity and exact polished 3D style, brown swept hair, blue varsity jacket/yellow star, backpack, pants. Head bowed noticeably, eyes looking DOWN toward shoes (NOT sideways or upward), eyelids lowered, very strong warm blush on both cheeks, lips pressed in a tiny nervous closed-mouth smile, shoulders hunched inward, both hands clasped together in front of chest. Body slightly turned inward. NOT cheerful, NOT dreamy, NOT flirting, NO waving. One full-body character, transparent background, no text or props.

女孩害羞第二版：
> Edit attached girl to show unmistakable SHY / EMBARRASSED emotion for preschool learning. SAME girl identity and exact polished 3D style, twin brown pigtails, blue varsity jacket/yellow star, backpack, pants. Head bowed noticeably, eyes looking DOWN toward shoes (NOT sideways or upward), eyelids lowered, very strong warm blush on both cheeks, lips pressed in a tiny nervous closed-mouth smile, shoulders hunched inward, both hands clasped together in front of chest. Body slightly turned inward. NOT cheerful, NOT dreamy, NOT flirting, NO waving. One full-body character, transparent background, no text or props.


## 半身裁切（2026-10-21）

运行时只使用半身像：由上面的全身图按头部宽度统一缩放、头顶统一留白，裁成 640 × 470 的透明 WebP，底边与舞台底边对齐。全身原图不再进入运行时目录。
