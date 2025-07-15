document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        if (user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
            document.body.innerHTML = `<div class="container text-center mt-5">... tela de verificação ...</div>`;
        } else {
            inicializarPainel(user);
        }
    });
});

async function inicializarPainel(currentUser) {
    // --- MAPEAMENTO DE ELEMENTOS ---
    const mainContent = document.getElementById('main-content');
    const groupList = document.getElementById('group-list');
    const btnLogout = document.getElementById('btnLogout');
    const formGrupo = document.getElementById('formGrupo');
    const formInvite = document.getElementById('formInvite');
    const groupDetailView = document.getElementById('group-detail-view');
    const emptyView = document.getElementById('empty-view');
    const groupDetailName = document.getElementById('group-detail-name');
    const memberList = document.getElementById('member-list');

    let activeGroupId = null;
    let grupos = {};

    btnLogout.addEventListener('click', () => auth.signOut());

    // --- LÓGICA PRINCIPAL ---

    // 1. Ouve e exibe os grupos dos quais o usuário é membro
    db.collection('groupMembers').where('userId', '==', currentUser.uid).where('status', '==', 'active')
        .onSnapshot(async (memberSnapshot) => {
            groupList.innerHTML = '';
            if (memberSnapshot.empty) {
                groupList.innerHTML = '<div class="list-group-item">Nenhum grupo. Crie um!</div>';
            } else {
                for (const memberDoc of memberSnapshot.docs) {
                    const memberData = memberDoc.data();
                    const groupDoc = await db.collection('groups').doc(memberData.groupId).get();
                    if (groupDoc.exists) {
                        grupos[groupDoc.id] = groupDoc.data();
                        const a = document.createElement('a');
                        a.href = '#';
                        a.className = 'list-group-item list-group-item-action';
                        a.dataset.groupId = groupDoc.id;
                        a.textContent = groupDoc.data().groupName;
                        if (memberData.role === 'manager') {
                            a.innerHTML += ' <span class="badge bg-primary">Gerente</span>';
                        }
                        groupList.appendChild(a);
                    }
                }
            }
            document.body.classList.remove('is-loading'); // Mostra o conteúdo
        }, error => console.error("Erro ao carregar grupos:", error));

    // 2. Lógica para exibir os detalhes de um grupo ao clicar nele
    groupList.addEventListener('click', e => {
        e.preventDefault();
        if (e.target.matches('a.list-group-item')) {
            const groupId = e.target.dataset.groupId;
            activeGroupId = groupId;
            showGroupDetails(groupId);
        }
    });

    function showGroupDetails(groupId) {
        // Alterna a visibilidade das seções
        emptyView.style.display = 'none';
        groupDetailView.style.display = 'block';

        // Atualiza o nome do grupo
        groupDetailName.textContent = grupos[groupId]?.groupName || 'Carregando...';

        // Ouve e exibe os membros do grupo selecionado
        db.collection('groupMembers').where('groupId', '==', groupId)
            .onSnapshot(memberSnapshot => {
                memberList.innerHTML = '';
                memberSnapshot.forEach(doc => {
                    const data = doc.data();
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = data.userEmail;
                    if (data.status === 'pending') {
                        li.innerHTML += ' <span class="badge bg-warning text-dark">Pendente</span>';
                    } else if (data.role === 'manager') {
                        li.innerHTML += ' <span class="badge bg-primary">Gerente</span>';
                    }
                    memberList.appendChild(li);
                });
            });
    }

    // 3. Lógica para criar um novo grupo
    formGrupo.addEventListener('submit', e => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value.trim();
        if (!groupName) return;

        const groupRef = db.collection('groups').doc();
        const memberRef = db.collection('groupMembers').doc();
        
        const batch = db.batch();
        batch.set(groupRef, { groupName, ownerUid: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(memberRef, { groupId: groupRef.id, userId: currentUser.uid, userEmail: currentUser.email, role: 'manager', status: 'active' });
        
        batch.commit().then(() => {
            formGrupo.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalGrupo')).hide();
        }).catch(err => console.error("Erro ao criar grupo:", err));
    });
    
    // 4. Lógica para convidar um novo membro
    formInvite.addEventListener('submit', e => {
        e.preventDefault();
        if (!activeGroupId) return;

        const memberEmail = document.getElementById('memberEmail').value.trim();
        if (!memberEmail) return;

        db.collection('groupMembers').add({
            groupId: activeGroupId,
            userId: null, // Será preenchido quando o usuário aceitar
            userEmail: memberEmail,
            role: 'member',
            status: 'pending' // O convite começa como pendente
        }).then(() => {
            formInvite.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalInvite')).hide();
            alert('Convite enviado!');
        }).catch(err => console.error('Erro ao enviar convite:', err));
    });
}