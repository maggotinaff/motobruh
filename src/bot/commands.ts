export const BOT_COMMANDS = [
  { command: "start", description: "Приветствие" },
  { command: "ride", description: "Начать поездку" },
  { command: "stop", description: "Завершить поездку" },
  { command: "who", description: "Кто катается + карта" },
  { command: "settings", description: "Личные настройки" },
  { command: "groupsettings", description: "Настройки группы (админы)" },
] as const;
