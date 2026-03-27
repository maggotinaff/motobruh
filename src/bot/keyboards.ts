import { Markup } from "telegraf";

export function rideDurationKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("15 мин", "ride:15"),
      Markup.button.callback("30 мин", "ride:30"),
    ],
    [
      Markup.button.callback("60 мин", "ride:60"),
      Markup.button.callback("120 мин", "ride:120"),
    ],
  ]);
}

export function settingsKeyboard(shareExact: boolean) {
  const exactLabel = shareExact ? "Точные коорд.: вкл" : "Точные коорд.: выкл";
  return Markup.inlineKeyboard([
    [Markup.button.callback(exactLabel, "set:exact:toggle")],
    [Markup.button.callback("Удалить мою последнюю точку", "set:clearpoint")],
  ]);
}

export function groupSettingsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Таймаут: 10 мин", "gs:timeout:10"),
      Markup.button.callback("15 мин", "gs:timeout:15"),
      Markup.button.callback("30 мин", "gs:timeout:30"),
    ],
    [
      Markup.button.callback("Объявления о поездках", "gs:toggle:ride"),
      Markup.button.callback("Объявления о районе", "gs:toggle:zone"),
    ],
  ]);
}
