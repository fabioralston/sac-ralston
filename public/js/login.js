const formError = document.getElementById("formError");

function showError(msg) {
  formError.textContent = msg;
  formError.classList.add("visible");
}

function clearError() {
  formError.classList.remove("visible");
  formError.textContent = "";
}

async function redirectIfLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) window.location.href = "app.html";
}
redirectIfLoggedIn();

const params = new URLSearchParams(window.location.search);
if (params.get("erro") === "dominio") {
  showError("Essa conta Google não pertence ao domínio @ralston.com.br. Use um e-mail da empresa.");
}

document.getElementById("googleBtn").addEventListener("click", async () => {
  clearError();
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/app.html",
      queryParams: {
        hd: "ralston.com.br",
        prompt: "select_account",
      },
    },
  });
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = "Entrar";

  if (error) {
    showError("E-mail ou senha inválidos.");
    return;
  }
  window.location.href = "app.html";
});

document.getElementById("showSignup").addEventListener("click", (e) => {
  e.preventDefault();
  clearError();
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupForm").style.display = "block";
});

document.getElementById("cancelSignup").addEventListener("click", () => {
  clearError();
  document.getElementById("signupForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const nome = document.getElementById("suNome").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;
  const btn = document.getElementById("signupBtn");
  btn.disabled = true;
  btn.textContent = "Criando...";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { nome } },
  });

  btn.disabled = false;
  btn.textContent = "Criar acesso";

  if (error) {
    showError(error.message);
    return;
  }
  showError("Conta criada. Se a confirmação de e-mail estiver ativa no seu projeto Supabase, verifique a caixa de entrada antes de entrar.");
});
