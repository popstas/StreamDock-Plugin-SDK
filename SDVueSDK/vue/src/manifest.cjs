/**
 * StreamDock Plugin Template V1.2.1 Documentation =>
 *
 *      1 => Development environment supports hot reload => No need to restart server and software when modifying code (restart required when modifying images/configuration files) !
 *      2 => Auto package to plugin directory => Use pnpm dev/build to automatically package to plugin directory, no manual copy/delete needed.
 *      3 => Data persistence drives view => Use v-model to bind settings values to achieve two-way binding and persistent data display !
 *      4 => Perfect integration with Naive UI component library => Adjustable theme, no style penetration needed, over 90 components, hope this helps you write less code.
 *
 *      !! Important Notes !! => Automation contains many convention configurations => Please fill out the following content carefully => Happy coding _> </>
 *
 * =========== Kriac =================================================================================== Updated on 2024.03.30 ===========>
 */

const Plugin = {
  UUID: 'pro.popstas.mqtt',
  version: '1.0.0',
  Icon: 'images/icon.png',
  i18n: {
    en: {
      Name: 'MQTT Button',
      Description: 'MQTT Button'
    },
    zh_CN: {
      Name: 'MQTT 按钮',
      Description: 'MQTT 按钮'
    }
  },
  Software: {
    MinimumVersion: '6.5'
  },
  ApplicationsToMonitor: {
    windows: []
  }
};

// Actions array
const Actions = [
  {
    UUID: 'mqttButton',
    Icon: 'images/icon.png',
    i18n: {
      en: {
        Name: 'MQTT Button',
        Tooltip: 'MQTT Button'
      },
      zh_CN: {
        Name: 'MQTT 按钮',
        Tooltip: 'MQTT 按钮'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'top',
        Image: 'images/default.png',
        ShowTitle: false
      }
    ],
    Settings: {},
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  }
];

// !! Do not modify !!
module.exports = {
  PUUID: Plugin.UUID,
  ApplicationsToMonitor: Plugin.ApplicationsToMonitor,
  Software: Plugin.Software,
  Version: Plugin.version,
  CategoryIcon: Plugin.Icon,
  i18n: Plugin.i18n,
  Actions
};
