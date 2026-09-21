export interface Scenario { title:string; question:string; followUps:string[]; keywords:string[]; timeLimit:number }
export const scenarios:Scenario[]=[
 {title:'商场走散了',question:'你在商场里和妈妈走散了，现在会怎么办？',followUps:['你会去找谁帮忙？','如果不记得电话呢？'],keywords:['服务台','工作人员','原地','电话','广播'],timeLimit:20},
 {title:'朋友不开心',question:'好朋友的作品被弄坏了，他很难过，你会怎么做？',followUps:['你会对他说什么？','怎样一起解决？'],keywords:['安慰','道歉','帮助','一起','修好'],timeLimit:20},
 {title:'课堂小意外',question:'上课时你不小心碰倒了同学的水杯，会怎么办？',followUps:['如果书被打湿了呢？'],keywords:['道歉','擦干','老师','赔偿','帮忙'],timeLimit:20}
]
