# 森林广播插画

使用内置 image_gen 生成，参考 public/assets/v3/emotions/boy-happy-half.webp 的圆润 3D 卡通质感。2026-10-23 接入大段森林广播，PNG 原图留在本机生成目录，运行时使用压缩后的 WebP（1000×1000、quality 82）。

- rainy.webp：雨中森林小屋，小兔子和松鼠在门口躲雨。
- sunny.webp：同一机位、同一小屋与动物，雨停、蓝天彩虹、开心招手。
- rain-start.webp：第 1 句，发现下雨，着急跑向小屋。
- rainbow-play.webp：第 4 句，走出小屋，一起发现彩虹。

运行时按 rain-start → rainy → sunny → rainbow-play 对应四句广播。四张图均通过内置 image_gen 制作，使用 sharp 压缩，原有两张未覆盖。

补充帧提示词：

3. Edit the rain illustration into the preceding moment: Oh no, rain, hurry to shelter. Preserve square camera, forest, cottage, trees, fence, wet stone path, exact rabbit and squirrel identities and rounded 3D style. Both full-body animals farther out on foreground path, hurrying to cottage, mildly startled/urgent but safe. Rabbit indicates cottage, squirrel follows with raised fluffy tail, both faces visible three-quarter view, no motion blur. Same rain and warm cottage windows. No extra animals, humans, text, UI, bubbles, logos or watermark.

4. Edit the sunny scene into final moment: come out to play and look at rainbow. Preserve square camera, forest, teal-roof cottage, fence, path, identities and polished 3D style. Both full-body animals forward on path; rabbit joyfully points to rainbow upper-left, squirrel looks up excitedly, smiles and playful poses. Faces visible, no clipping. Clear rainbow and warm sunshine, no rain. No extra animals, humans, text, bubbles, UI, border or watermark.

生成提示词：

1. Use case: illustration-story. New square full-bleed scene for a children's speech assessment website. Boy image is style reference only, do not include him. Match polished rounded 3D animated film aesthetic, large expressive eyes, soft detailed fur, vibrant friendly colors, no outlines. A forest clearing in gentle rain, cozy wooden cottage with teal curved roof and warm doorway, rounded lush trees. Exactly two full-body baby animals in the lower middle: white rabbit with pink inner ears and orange-brown squirrel with fluffy tail, mildly concerned but safe, seeking shelter near the porch. Child eye-level camera, rich depth, soft overcast light, light rain and puddles, calm upper 15% for separate UI. No text, bubbles, UI, border, watermark, emoji or flat clip art.

2. Edit the rainy scene into its happy after-rain counterpart. Preserve square camera, framing, trees, teal-roof cottage, door, windows, fence, path, animal identities, scale and positions. Remove falling rain; bright blue sky, warm sunshine and soft rainbow in upper-left sky. Keep slight reflective puddles. Same two animals now have cheerful eyes and smiles, rabbit raises one paw, squirrel opens its paws. Match original rounded 3D rendering and detailed fur. No additional animals, humans, text, speech bubbles, UI, border or watermark.
