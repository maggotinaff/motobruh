export const BOT_COMMANDS = [
  { command: "start", description: "Приветствие и как всё работает" },
  { command: "help", description: "Список команд" },
  { command: "ride", description: "Начать поездку" },
  { command: "stop", description: "Завершить поездку" },
  { command: "who", description: "Кто сейчас катается" },
  { command: "where", description: "Где сейчас участники (районы)" },
  { command: "near", description: "Кто рядом с тобой" },
  { command: "status", description: "Мой статус поездки" },
  { command: "privacy", description: "Какие данные хранятся" },
  { command: "settings", description: "Личные настройки" },
  { command: "groupsettings", description: "Настройки группы (админы)" },
] as const;
