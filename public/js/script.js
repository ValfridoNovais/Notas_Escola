document.addEventListener("DOMContentLoaded", () => {
  const loadingDiv = document.getElementById("loading");
  const mainContentDiv = document.getElementById("main-content");

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // CORREÇÃO AQUI: Verificação mais segura do provedor de login.
    const isPasswordProvider = user.providerData.some(
      (p) => p.providerId === "password"
    );

    if (isPasswordProvider && !user.emailVerified) {
      loadingDiv.style.display = "none";
      mainContentDiv.innerHTML = `
                <div class="container text-center mt-5">
                    <h3 class="text-danger">Verifique seu E-mail</h3>
                    <p>Um link de confirmação foi enviado para <strong>${user.email}</strong>.</p>
                    <p>Por favor, clique no link para ativar sua conta. Se não o recebeu, verifique sua caixa de spam.</p>
                    <button id="resend-email" class="btn btn-primary">Reenviar E-mail de Verificação</button>
                    <button id="logout" class="btn btn-secondary ms-2">Sair</button>
                </div>`;
      mainContentDiv.style.display = "block";

      document.getElementById("resend-email").addEventListener("click", () => {
        user
          .sendEmailVerification()
          .then(() => alert("Um novo e-mail de verificação foi enviado!"))
          .catch((err) => alert("Erro ao reenviar e-mail: " + err.message));
      });
      document.getElementById("logout").addEventListener("click", () => {
        auth.signOut().then(() => {
          window.location.href = "login.html";
        });
      });
    } else {
      loadingDiv.style.display = "none";
      mainContentDiv.style.display = "block";
      inicializarApp(user);
    }
  });
});

async function inicializarApp(currentUser) {
  try {
    const formPerfil = document.getElementById("formPerfil");
    const formNota = document.getElementById("formNota");
    const selectProfile = document.getElementById("selectProfile");
    const listaAtividades = document.getElementById("listaAtividades");
    const btnLogout = document.getElementById("btnLogout");

    let perfis = {};

    btnLogout.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "index.html"; // Redireciona para a página de boas-vindas ao sair
      });
    });

    const errorHandler = (error) => {
      console.error("ERRO DE CONSULTA FIRESTORE:", error);
      listaAtividades.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados. Verifique o console (F12) para detalhes.</td></tr>`;
    };

    db.collection("profiles")
      .where("creatorUid", "==", currentUser.uid)
      .orderBy("profileName")
      .onSnapshot((snapshot) => {
        selectProfile.innerHTML = "";
        perfis = {};
        if (snapshot.empty) {
          selectProfile.innerHTML =
            "<option>Crie um perfil para começar</option>";
          listaAtividades.innerHTML =
            '<tr><td colspan="6" class="text-center">Nenhum perfil criado.</td></tr>';
          return;
        }
        snapshot.forEach((doc) => {
          const perfil = doc.data();
          perfis[doc.id] = perfil;
          const opt = document.createElement("option");
          opt.value = doc.id;
          opt.textContent = perfil.profileName;
          selectProfile.appendChild(opt);
        });
        if (selectProfile.value) {
          carregarAtividades(selectProfile.value);
        }
      }, errorHandler);

    selectProfile.addEventListener("change", () =>
      carregarAtividades(selectProfile.value)
    );

    formPerfil.addEventListener("submit", (e) => {
      e.preventDefault();
      const profileName = document.getElementById("profileName").value.trim();
      if (profileName) {
        db.collection("profiles")
          .add({
            profileName: profileName,
            creatorUid: currentUser.uid,
            creatorEmail: currentUser.email,
            memberEmail:
              document.getElementById("memberEmail").value.trim() || null,
            memberUid: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          })
          .then(() => {
            formPerfil.reset();
            bootstrap.Modal.getInstance(
              document.getElementById("modalPerfil")
            ).hide();
          })
          .catch((err) => console.error("Erro ao criar perfil:", err));
      }
    });

    formNota.addEventListener("submit", (e) => {
      e.preventDefault();
      const profileId = selectProfile.value;
      if (!profileId) {
        alert("Por favor, selecione um perfil.");
        return;
      }

      const notaObtida = parseFloat(
        document.getElementById("notaObtida").value
      );
      const notaMaxima = parseFloat(
        document.getElementById("notaMaxima").value
      );
      if (notaObtida > notaMaxima) {
        alert("Nota obtida não pode exceder a nota máxima.");
        return;
      }

      const percentual =
        notaMaxima > 0 ? Math.round((notaObtida / notaMaxima) * 100) : 0;
      let recompensa = 0;
      if (percentual === 100) recompensa = 10.0;
      else if (percentual >= 80) recompensa = 5.0;

      db.collection("activities")
        .add({
          profileId,
          disciplina: document.getElementById("selectDisciplina").value,
          tipo: document.getElementById("selectTipo").value,
          data: document.getElementById("dataAtividade").value,
          notaObtida,
          notaMaxima,
          percentual,
          recompensa,
          guardianUid: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          formNota.reset();
          alert("Atividade lançada com sucesso!");
        })
        .catch((err) => console.error("Erro ao lançar atividade:", err));
    });

    function carregarAtividades(profileId) {
      if (!profileId) {
        listaAtividades.innerHTML = "";
        return;
      }
      db.collection("activities")
        .where("profileId", "==", profileId)
        .orderBy("data", "desc")
        .onSnapshot(
          (snapshot) => {
            listaAtividades.innerHTML = "";
            if (snapshot.empty) {
              listaAtividades.innerHTML =
                '<tr><td colspan="6" class="text-center">Nenhuma atividade para este perfil.</td></tr>';
              return;
            }
            snapshot.forEach((doc) => {
              const atividade = doc.data();
              const tr = document.createElement("tr");
              tr.innerHTML = `
                            <td>${atividade.data}</td>
                            <td>${
                              perfis[atividade.profileId]?.profileName || "..."
                            }</td>
                            <td>${atividade.disciplina}</td>
                            <td>${atividade.percentual}%</td>
                            <td>${
                              atividade.recompensa
                                ? "R$ " + atividade.recompensa.toFixed(2)
                                : "-"
                            }</td>
                            <td><button class="btn btn-sm btn-outline-danger deletar" data-id="${
                              doc.id
                            }">Excluir</button></td>`;
              listaAtividades.appendChild(tr);
            });
          },
          (error) =>
            console.error(
              `Erro ao carregar atividades para o perfil ${profileId}:`,
              error
            )
        );
    }

    listaAtividades.addEventListener("click", (e) => {
      if (e.target.classList.contains("deletar")) {
        const docId = e.target.dataset.id;
        if (confirm("Tem certeza que deseja excluir esta atividade?")) {
          db.collection("activities").doc(docId).delete();
        }
      }
    });
  } catch (e) {
    console.error("ERRO FATAL NA INICIALIZAÇÃO DO APP:", e);
    mainContentDiv.innerHTML = `<div class="alert alert-danger">Ocorreu um erro crítico ao carregar o aplicativo. Verifique o console (F12) para detalhes.</div>`;
  }
}
