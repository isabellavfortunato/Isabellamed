/* Service worker do Firebase Cloud Messaging.
   Ele recebe o aviso mandado pelo servidor e faz o registro do token deste
   aparelho. A notificação em segundo plano é exibida automaticamente a partir
   do conteúdo enviado, por isso não a exibimos de novo aqui. */

importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA7bDVe9YOp4W1FXb3lf6hnCV7vOgvXP8E",
  authDomain: "isabella-meds.firebaseapp.com",
  projectId: "isabella-meds",
  storageBucket: "isabella-meds.firebasestorage.app",
  messagingSenderId: "652402708275",
  appId: "1:652402708275:web:cd3baf8aa13d412de2f846"
});

firebase.messaging();

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  // A etiqueta da notificação carrega qual dose foi avisada, no formato dose-identificador.
  var etiqueta = event.notification.tag || "";
  var dose = etiqueta.indexOf("dose-") === 0 ? etiqueta.slice(5) : "";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if ("focus" in lista[i]) {
          if (dose) { try { lista[i].postMessage({ dose: dose }); } catch (e) {} }
          return lista[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(dose ? "./?dose=" + dose : "./");
    })
  );
});
