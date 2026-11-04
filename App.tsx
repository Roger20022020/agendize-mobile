import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Modal, Alert, Linking, Share 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, Calendar, Users, Settings, Plus, XCircle, Trash2, DownloadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const INITIAL_DB = {
  clients: [],
  services: [
    { id: 1, name: "Corte / Styling", duration: 45, price: 50 },
    { id: 2, name: "Consultoria Completa", duration: 90, price: 120 }
  ],
  appointments: [],
  settings: {
    waTemplate: "Olá {cliente}! 🎉\nSeu agendamento de {servico} foi confirmado para {data} às {hora}. Te aguardo!"
  }
};

export default function App() {
  const [db, setDb] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Filtros
  const [dashFilter, setDashFilter] = useState('month'); // today, week, month, all
  const [agendaFilter, setAgendaFilter] = useState('future'); // future, past
  
  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  
  // Formulários
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', duration: '', price: '' });
  const [bookForm, setBookForm] = useState({ clientId: '', serviceId: '', date: '', time: '' });
  const [waMessage, setWaMessage] = useState('');

  // Controle dos Calendários
  const [showDashPicker, setShowDashPicker] = useState(false);
  const [dashCustomDate, setDashCustomDate] = useState(new Date());
  const [showBookPicker, setShowBookPicker] = useState(false);

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      const saved = await AsyncStorage.getItem('@AgendizeOfflineDB');
      if (saved) {
        const parsed = JSON.parse(saved);
        if(!parsed.settings) parsed.settings = INITIAL_DB.settings;
        setDb(parsed);
        setWaMessage(parsed.settings.waTemplate);
      } else {
        setDb(INITIAL_DB);
        setWaMessage(INITIAL_DB.settings.waTemplate);
        await AsyncStorage.setItem('@AgendizeOfflineDB', JSON.stringify(INITIAL_DB));
      }
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar os dados locais.");
    }
  };

  const saveDatabase = async (newDb: any) => {
    try {
      setDb(newDb);
      await AsyncStorage.setItem('@AgendizeOfflineDB', JSON.stringify(newDb));
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar os dados.");
    }
  };

  // ============================================================================
  // FUNÇÕES DE UTILIDADE E EXPORTAÇÃO
  // ============================================================================
  const getNext14Days = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const generateTimeSlots = () => {
    return ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  };

  const handleExportCSV = async () => {
    try {
      let csv = "Data,Hora,Cliente,Servico,Valor,Status\n";
      db.appointments.forEach((a: any) => {
        const client = db.clients.find((c: any) => c.id.toString() === a.clientId.toString());
        const srv = db.services.find((s: any) => s.id.toString() === a.serviceId.toString());
        csv += `${a.date},${a.time},${client?.name || 'Desconhecido'},${srv?.name || 'Desconhecido'},${srv?.price || 0},${a.status}\n`;
      });
      
      await Share.share({
        message: csv,
        title: "Agendize_Exportacao.csv"
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível exportar os dados.");
    }
  };

  const handleBackupDrive = () => {
    Alert.alert("Backup em Nuvem", "Na versão final publicada nas lojas, este botão conectará automaticamente com a sua conta do Google Drive para salvar uma cópia de segurança invisível de todos os seus dados.");
  };

  // ============================================================================
  // AÇÕES DE NEGÓCIO
  // ============================================================================
  const handleAddClient = () => {
    if (!clientForm.name || !clientForm.phone) return Alert.alert("Atenção", "Preencha os campos.");
    const newDb = { ...db, clients: [...db.clients, { id: Date.now(), ...clientForm }] };
    saveDatabase(newDb);
    setShowClientModal(false);
    setClientForm({ name: '', phone: '' });
  };

  const handleAddService = () => {
    if (!serviceForm.name || !serviceForm.duration || !serviceForm.price) return Alert.alert("Atenção", "Preencha todos os campos.");
    const newDb = { 
      ...db, 
      services: [...db.services, { 
        id: Date.now(), 
        name: serviceForm.name, 
        duration: parseInt(serviceForm.duration), 
        price: parseFloat(serviceForm.price) 
      }] 
    };
    saveDatabase(newDb);
    setShowServiceModal(false);
    setServiceForm({ name: '', duration: '', price: '' });
  };

  const handleDeleteService = (id: number) => {
    Alert.alert("Excluir Serviço", "Tem certeza? Isso não afetará os agendamentos antigos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => {
        const newDb = { ...db, services: db.services.filter((s: any) => s.id !== id) };
        saveDatabase(newDb);
      }}
    ]);
  };

  const handleSaveSettings = () => {
    const newDb = { ...db, settings: { ...db.settings, waTemplate: waMessage } };
    saveDatabase(newDb);
    Alert.alert("Sucesso", "Configurações salvas!");
  };

  const handleAddBooking = () => {
    if (!bookForm.clientId || !bookForm.serviceId || !bookForm.date || !bookForm.time) {
      return Alert.alert("Atenção", "Preencha todos os campos do agendamento (Cliente, Serviço, Data e Hora).");
    }
    const newDb = { 
      ...db, 
      appointments: [...db.appointments, { id: Date.now(), ...bookForm, status: 'confirmado' }] 
    };
    saveDatabase(newDb);
    setShowBookingModal(false);
    setActiveTab('agenda');
    setAgendaFilter('future');
    setBookForm({ clientId: '', serviceId: '', date: '', time: '' });

    const client = db.clients.find((c: any) => c.id.toString() === bookForm.clientId.toString());
    const srv = db.services.find((s: any) => s.id.toString() === bookForm.serviceId.toString());
    
    Alert.alert(
      "Agendado!", 
      "Deseja avisar a cliente no WhatsApp?",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: () => {
            const [y, m, d] = bookForm.date.split('-');
            const msg = db.settings.waTemplate
              .replace('{cliente}', client.name)
              .replace('{servico}', srv.name)
              .replace('{data}', `${d}/${m}/${y}`)
              .replace('{hora}', bookForm.time);
            Linking.openURL(`whatsapp://send?phone=${client.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`);
        }}
      ]
    );
  };

  const handleCancelAppointment = (id: number) => {
    Alert.alert("Cancelar Horário", "Deseja realmente cancelar este agendamento?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, Cancelar", style: "destructive", onPress: () => {
        const newDb = {
          ...db,
          appointments: db.appointments.map((a: any) => a.id === id ? { ...a, status: 'cancelado' } : a)
        };
        saveDatabase(newDb);
      }}
    ]);
  };

  if (!db) return <View style={styles.container}><Text>Carregando...</Text></View>;

  // ============================================================================
  // TELAS DO APLICATIVO
  // ============================================================================
  const renderDashboard = () => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date(8640000000000000);

    if (dashFilter === 'today') {
      start = new Date(now.setHours(0,0,0,0));
      end = new Date(now.setHours(23,59,59,999));
    } else if (dashFilter === 'week') {
      start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    } else if (dashFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
    } else if (dashFilter === 'custom') {
      start = new Date(dashCustomDate); start.setHours(0,0,0,0);
      end = new Date(dashCustomDate); end.setHours(23,59,59,999);
    }

    const filteredApps = db.appointments.filter((a: any) => {
      const aDate = new Date(`${a.date}T12:00:00`);
      return aDate >= start && aDate <= end && a.status === 'confirmado';
    });

    const revenue = filteredApps.reduce((acc: number, app: any) => {
      const s = db.services.find((srv: any) => srv.id.toString() === app.serviceId.toString());
      return acc + (s ? s.price : 0);
    }, 0);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Visão Geral</Text>
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' },
            { id: 'all', label: 'Tudo' },
            { id: 'custom', label: 'Data Específica' }
          ].map(f => (
            <TouchableOpacity 
              key={f.id} 
              onPress={() => {
                setDashFilter(f.id);
                if (f.id === 'custom') setShowDashPicker(true);
              }}
              style={[styles.filterBtn, dashFilter === f.id && styles.filterBtnActive]}
            >
              <Text style={[styles.filterBtnText, dashFilter === f.id && styles.filterBtnTextActive]}>
                {f.id === 'custom' && dashFilter === 'custom' ? dashCustomDate.toLocaleDateString('pt-BR') : f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {showDashPicker && (
          <DateTimePicker
            value={dashCustomDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDashPicker(false);
              if (event.type === 'set' && selectedDate) {
                setDashCustomDate(selectedDate);
              } else if (event.type === 'dismissed' && dashFilter === 'custom') {
                setDashFilter('month'); // Retorna pro mês se cancelar
              }
            }}
          />
        )}

        <View style={styles.dashGrid}>
          <View style={[styles.dashCard, { backgroundColor: '#3b82f6' }]}>
            <Text style={styles.dashCardTitle}>FATURAMENTO</Text>
            <Text style={styles.dashCardValue}>R$ {revenue.toFixed(2)}</Text>
          </View>
          <View style={[styles.dashCard, { backgroundColor: '#fff' }]}>
            <Text style={[styles.dashCardTitle, { color: '#94a3b8' }]}>ATENDIMENTOS</Text>
            <Text style={[styles.dashCardValue, { color: '#1e293b' }]}>{filteredApps.length}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={() => {
          if(db.clients.length === 0) return Alert.alert("Aviso", "Cadastre uma cliente primeiro na aba Clientes.");
          setShowBookingModal(true);
        }}>
          <Plus color="#fff" size={20} />
          <Text style={styles.mainBtnText}>Novo Agendamento</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderAgenda = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let filtered = db.appointments.filter((app: any) => {
      if (agendaFilter === 'future') return app.date >= todayStr;
      return app.date < todayStr;
    }).sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));

    if (agendaFilter === 'past') filtered = filtered.reverse();

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.pageTitle}>Minha Agenda</Text>

        <View style={styles.tabSwitcher}>
          <TouchableOpacity 
            style={[styles.subTabBtn, agendaFilter === 'future' && styles.subTabBtnActive]} 
            onPress={() => setAgendaFilter('future')}
          >
            <Text style={[styles.subTabText, agendaFilter === 'future' && styles.subTabTextActive]}>Próximos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTabBtn, agendaFilter === 'past' && styles.subTabBtnActive]} 
            onPress={() => setAgendaFilter('past')}
          >
            <Text style={[styles.subTabText, agendaFilter === 'past' && styles.subTabTextActive]}>Histórico</Text>
          </TouchableOpacity>
        </View>

        {filtered.length === 0 && <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>}
        
        {filtered.map((app: any) => {
          const client = db.clients.find((c: any) => c.id.toString() === app.clientId.toString());
          const srv = db.services.find((s: any) => s.id.toString() === app.serviceId.toString());
          const [y, m, d] = app.date.split('-');
          const isCanceled = app.status === 'cancelado';

          return (
            <View key={app.id} style={[styles.cardItem, isCanceled && { opacity: 0.6, borderColor: '#fecaca' }]}>
              {isCanceled && <View style={styles.badgeRed}><Text style={styles.badgeRedText}>CANCELADO</Text></View>}
              {!isCanceled && agendaFilter === 'past' && <View style={styles.badgeGreen}><Text style={styles.badgeGreenText}>CONCLUÍDO</Text></View>}
              
              <Text style={styles.itemTitle}>{client?.name || 'Desconhecida'}</Text>
              <Text style={styles.itemSub}>{srv?.name} • R$ {srv?.price}</Text>
              <Text style={[styles.itemSub, { fontWeight: 'bold', color: '#3b82f6', marginTop: 5 }]}>
                {d}/{m}/{y} às {app.time}
              </Text>

              {!isCanceled && agendaFilter === 'future' && (
                <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor: '#fef2f2'}]}
                    onPress={() => handleCancelAppointment(app.id)}
                  >
                    <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 12}}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor: '#ecfdf5'}]}
                    onPress={() => Linking.openURL(`whatsapp://send?phone=${client?.phone.replace(/\D/g, '')}`)}
                  >
                    <Text style={{color: '#10b981', fontWeight: 'bold', fontSize: 12}}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderClients = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Meus Clientes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowClientModal(true)}>
          <Text style={styles.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {db.clients.length === 0 && <Text style={styles.emptyText}>Nenhuma cliente cadastrada.</Text>}
      {db.clients.map((c: any) => (
        <View key={c.id} style={styles.cardItem}>
          <View>
            <Text style={styles.itemTitle}>{c.name}</Text>
            <Text style={styles.itemSub}>{c.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=${c.phone.replace(/\D/g, '')}`)}>
            <Text style={{color: '#10b981', fontWeight: 'bold'}}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.pageTitle}>Ajustes</Text>

      {/* Seção: Serviços */}
      <View style={styles.sectionBlock}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Meus Serviços</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowServiceModal(true)}>
            <Text style={styles.addBtnText}>+ Novo</Text>
          </TouchableOpacity>
        </View>
        
        {db.services.map((s: any) => (
          <View key={s.id} style={styles.serviceRow}>
            <View>
              <Text style={styles.itemTitle}>{s.name}</Text>
              <Text style={styles.itemSub}>R$ {s.price.toFixed(2)} • {s.duration} min</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteService(s.id)}>
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Seção: Mensagem do WhatsApp */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Mensagem Padrão (WhatsApp)</Text>
        <Text style={styles.helpText}>Use as tags {'{cliente}'}, {'{servico}'}, {'{data}'} e {'{hora}'}.</Text>
        <TextInput 
          style={styles.textArea} 
          multiline={true} 
          numberOfLines={4}
          value={waMessage} 
          onChangeText={setWaMessage} 
        />
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSaveSettings}>
          <Text style={styles.secondaryBtnText}>Salvar Mensagem</Text>
        </TouchableOpacity>
      </View>

      {/* Seção: Dados e Backup */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Dados do Aplicativo</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleBackupDrive}>
          <DownloadCloud color="#3b82f6" size={20} />
          <Text style={styles.exportBtnText}>Sincronizar com Google Drive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <FileSpreadsheet color="#10b981" size={20} />
          <Text style={[styles.exportBtnText, {color: '#10b981'}]}>Exportar Planilha (Excel)</Text>
        </TouchableOpacity>
      </View>

      <View style={{height: 50}} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header Fixo */}
      <View style={styles.header}>
        <Text style={styles.logo}>Agendize</Text>
        <View style={styles.avatar}><Text style={styles.avatarText}>EU</Text></View>
      </View>

      {/* Conteúdo das Abas */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'agenda' && renderAgenda()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* Navegação Inferior */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('dashboard')}>
          <Home color={activeTab === 'dashboard' ? '#3b82f6' : '#94a3b8'} size={24} />
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('agenda')}>
          <Calendar color={activeTab === 'agenda' ? '#3b82f6' : '#94a3b8'} size={24} />
          <Text style={[styles.navText, activeTab === 'agenda' && styles.navTextActive]}>Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('clients')}>
          <Users color={activeTab === 'clients' ? '#3b82f6' : '#94a3b8'} size={24} />
          <Text style={[styles.navText, activeTab === 'clients' && styles.navTextActive]}>Clientes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('settings')}>
          <Settings color={activeTab === 'settings' ? '#3b82f6' : '#94a3b8'} size={24} />
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: NOVO CLIENTE */}
      <Modal visible={showClientModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Cliente</Text>
              <TouchableOpacity onPress={() => setShowClientModal(false)}><XCircle color="#94a3b8" size={28} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Nome Completo" value={clientForm.name} onChangeText={t => setClientForm({...clientForm, name: t})} />
            <TextInput style={styles.input} placeholder="WhatsApp (DDD + Número)" keyboardType="phone-pad" value={clientForm.phone} onChangeText={t => setClientForm({...clientForm, phone: t})} />
            <TouchableOpacity style={styles.mainBtn} onPress={handleAddClient}><Text style={styles.mainBtnText}>Salvar Cliente</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: NOVO SERVIÇO */}
      <Modal visible={showServiceModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Serviço</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}><XCircle color="#94a3b8" size={28} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Nome do Serviço" value={serviceForm.name} onChangeText={t => setServiceForm({...serviceForm, name: t})} />
            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput style={[styles.input, {flex: 1}]} placeholder="Duração (min)" keyboardType="numeric" value={serviceForm.duration} onChangeText={t => setServiceForm({...serviceForm, duration: t})} />
              <TextInput style={[styles.input, {flex: 1}]} placeholder="Preço (R$)" keyboardType="numeric" value={serviceForm.price} onChangeText={t => setServiceForm({...serviceForm, price: t})} />
            </View>
            <TouchableOpacity style={styles.mainBtn} onPress={handleAddService}><Text style={styles.mainBtnText}>Salvar Serviço</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: NOVO AGENDAMENTO RAPIDO */}
      <Modal visible={showBookingModal} animationType="slide" transparent={true}>
        <View style={[styles.modalContainer, {justifyContent: 'flex-start', paddingTop: 60}]}>
          <View style={[styles.modalContent, {flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agendar Horário</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}><XCircle color="#94a3b8" size={28} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              {/* Seleção de Cliente */}
              <Text style={styles.fieldLabel}>1. Escolha a Cliente</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {db.clients.map((c: any) => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.selectChip, bookForm.clientId === c.id && styles.selectChipActive]}
                    onPress={() => setBookForm({...bookForm, clientId: c.id})}
                  >
                    <Text style={[styles.selectChipText, bookForm.clientId === c.id && styles.selectChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Seleção de Serviço */}
              <Text style={styles.fieldLabel}>2. Escolha o Serviço</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {db.services.map((s: any) => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.selectChip, bookForm.serviceId === s.id && styles.selectChipActive]}
                    onPress={() => setBookForm({...bookForm, serviceId: s.id})}
                  >
                    <Text style={[styles.selectChipText, bookForm.serviceId === s.id && styles.selectChipTextActive]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Seleção de Data */}
              <Text style={styles.fieldLabel}>3. Data</Text>
              
              <TouchableOpacity 
                style={[styles.selectChip, bookForm.date ? styles.selectChipActive : {}, {marginBottom: 20}]}
                onPress={() => setShowBookPicker(true)}
              >
                <Text style={[styles.selectChipText, bookForm.date ? styles.selectChipTextActive : {}]}>
                  {bookForm.date ? bookForm.date.split('-').reverse().join('/') : "📅 Escolher no Calendário"}
                </Text>
              </TouchableOpacity>

              {showBookPicker && (
                <DateTimePicker
                  value={bookForm.date ? new Date(bookForm.date + 'T12:00:00') : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowBookPicker(false);
                    if (event.type === 'set' && selectedDate) {
                      const dateStr = selectedDate.toISOString().split('T')[0];
                      setBookForm({...bookForm, date: dateStr});
                    }
                  }}
                />
              )}

              {/* Seleção de Hora */}
              <Text style={styles.fieldLabel}>4. Horário</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 30}}>
                {generateTimeSlots().map((t: string) => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.selectChip, bookForm.time === t && styles.selectChipActive]}
                    onPress={() => setBookForm({...bookForm, time: t})}
                  >
                    <Text style={[styles.selectChipText, bookForm.time === t && styles.selectChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.mainBtn} onPress={handleAddBooking}>
                <CheckCircle2 color="#fff" size={20} />
                <Text style={styles.mainBtnText}>Confirmar Agendamento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ============================================================================
// ESTILIZAÇÃO (STYLESHEET)
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  logo: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  avatar: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  content: { flex: 1 },
  tabContent: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
  
  // Dashboard & Filtros
  filterScroll: { marginBottom: 20 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 10 },
  filterBtnActive: { backgroundColor: '#3b82f6' },
  filterBtnText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  filterBtnTextActive: { color: '#ffffff' },
  dashGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  dashCard: { flex: 1, padding: 20, borderRadius: 20, marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  dashCardTitle: { fontSize: 11, fontWeight: 'bold', color: '#bfdbfe', marginBottom: 5 },
  dashCardValue: { fontSize: 26, fontWeight: '900', color: '#fff' },
  
  // Sub-tabs (Agenda)
  tabSwitcher: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 20 },
  subTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  subTabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  subTabText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  subTabTextActive: { color: '#3b82f6' },

  // Buttons & Lists
  mainBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  
  cardItem: { backgroundColor: '#fff', padding: 18, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  itemTitle: { fontWeight: 'bold', color: '#1e293b', fontSize: 17 },
  itemSub: { color: '#64748b', fontSize: 13, marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 30, fontSize: 15 },
  
  badgeRed: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeRedText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
  badgeGreen: { position: 'absolute', top: 10, right: 10, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeGreenText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },

  // Settings
  sectionBlock: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  helpText: { fontSize: 12, color: '#94a3b8', marginBottom: 15 },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, fontSize: 15, textAlignVertical: 'top', minHeight: 100, marginBottom: 15 },
  secondaryBtn: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 15 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  exportBtnText: { fontSize: 15, fontWeight: 'bold', color: '#3b82f6' },

  // Modals & Inputs
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.6)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 16, marginBottom: 15, fontSize: 16 },
  
  // Custom Selectors (Booking)
  fieldLabel: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 10 },
  selectChip: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginRight: 10 },
  selectChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  selectChipText: { fontSize: 15, fontWeight: 'bold', color: '#475569' },
  selectChipTextActive: { color: '#fff' },

  // Nav
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 15, paddingBottom: 35, borderTopWidth: 1, borderColor: '#f1f5f9' },
  navBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginTop: 6 },
  navTextActive: { color: '#3b82f6' }
});