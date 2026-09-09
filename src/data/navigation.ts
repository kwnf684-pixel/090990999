export const groups = [
  {
    label: "الحوالات",
    icon: "transfer",
    items: [
      ["إرسال حوالة", "/transfers/new"],
      ["الحوالات الصادرة", "/transfers/outgoing"],
      ["الحوالات الواردة", "/transfers/incoming"],
      ["الحوالات غير المسلمة", "/transfers/pending"],
      ["الحوالات الملغاة", "/transfers/cancelled"],
    ],
  },
  {
    label: "الصيرفة",
    icon: "exchange",
    items: [
      ["شراء عملة", "/exchange/buy"],
      ["بيع عملة", "/exchange/sell"],
      ["أسعار الصرف", "/exchange/rates"],
      ["سجل عمليات الصرف", "/exchange/history"],
    ],
  },
  {
    label: "العملاء",
    icon: "users",
    items: [
      ["قائمة العملاء", "/customers"],
      ["إضافة عميل", "/customers/new"],
      ["أرصدة العملاء", "/customers/balances"],
    ],
  },
  {
    label: "الصندوق",
    icon: "wallet",
    items: [
      ["الصناديق", "/cashbox"],
      ["قبض", "/cashbox/receipt"],
      ["صرف", "/cashbox/payment"],
      ["كشف رصيد الصندوق", "/cashbox/balances"],
    ],
  },
  {
    label: "التقارير",
    icon: "chart",
    items: [
      ["التقرير اليومي", "/reports/daily"],
      ["التقرير الشهري", "/reports/monthly"],
      ["التقرير السنوي", "/reports/yearly"],
    ],
  },
  {
    label: "الحساب",
    icon: "user",
    items: [
      ["الإعدادات", "/settings"],
      ["معلومات الحساب", "/account"],
      ["معلومات الاشتراك", "/account/subscription"],
      ["الأجهزة", "/account/devices"],
    ],
  },
];
export const pages = groups.flatMap((group) =>
  group.items.map(([title, path]) => ({
    title,
    path,
    group: group.label,
    icon: group.icon,
    description: `واجهة ${title} ضمن قسم ${group.label}، لمتابعة وتنظيم أعمال المكتب.`,
  })),
);

