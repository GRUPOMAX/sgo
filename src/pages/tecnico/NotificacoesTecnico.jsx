import {
    Box, Heading, Text, Stack, Badge, Spinner, Button, useToast, Flex
  } from '@chakra-ui/react'
  import { useEffect, useState, useCallback } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { apiGet } from '../../services/api'
  import { useOfflineData } from '../../hooks/useOfflineData'
  import TecnicoBottomNav from '../../components/tecnico/TecnicoBottomNav'
  import { parseISO, format } from 'date-fns';
  
  function NotificacoesTecnico() {
    const [notificacoes, setNotificacoes] = useState([]);
    const { data: registrosCache, loading } = useOfflineData({
      url: '/api/v2/tables/mtnh21kq153to8h/records',
      localKey: 'notificacoes_tecnico'
    });
  
    const navigate = useNavigate();
    const tecnicoID = localStorage.getItem('ID_Tecnico_Responsavel');
  
    const [novosRegistros, setNovosRegistros] = useState(null);
    const registros = novosRegistros ? { list: novosRegistros } : registrosCache;
  
    const fetchNovosRegistros = useCallback(async () => {
      try {
        const res = await apiGet('/api/v2/tables/mtnh21kq153to8h/records');
        if (res?.list) {
          setNovosRegistros(res.list);
        }
      } catch (error) {
        console.error('Erro ao buscar novos registros:', error);
      }
    }, []);
  
    const formatarData = (data) => {
        const parsedDate = parseISO(data); // Converte a string ISO para uma data
        const dataSemHora = parsedDate.toISOString().slice(0, 10); // Retira a hora (ficando com o formato YYYY-MM-DD)
        return dataSemHora.split('-').reverse().join('/'); // Formata para "dd/MM/yyyy"
      };
      
      
  
    const getCorStatus = (status) => {
      switch (status) {
        case 'Agendada': return 'cyan';
        case 'Reagendada': return 'purple';
        default: return 'gray';
      }
    };
  
    const irParaDetalhes = (ordem) => {
      if (ordem.UnicID_OS) {
        navigate(`/tecnico/ordem/${ordem.UnicID_OS}`, { state: { ordem } });
      }
    };
  
    const atualizarNotificacoes = useCallback(() => {
      if (!registros) return;
  
      const lista = [];
  
      registros.list.forEach(registro => {
        const raw = registro['Ordem de Serviços'];
        const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  
        json.empresas.forEach(emp => {
          emp.Ordens_de_Servico?.forEach(ordem => {
            if (ordem.ID_Tecnico_Responsavel !== tecnicoID) return;
  
            const statusOS = ordem.Status_OS?.toLowerCase();
            const isAgendada = statusOS === 'agendada' || statusOS === 'reagendada';
  
            if (isAgendada) {
              const dataAgendada = ordem.Data_Agendamento_OS || ordem.Horario_Agendamento_OS;
              const dataAgendadaFormatada = formatarData(dataAgendada);
              lista.push({ ...ordem, empresa: emp.empresa, dataAgendadaFormatada });
            }
          });
        });
      });
  
      // Verifique se a lista realmente mudou antes de atualizar o estado
      setNotificacoes(prevNotificacoes => {
        if (JSON.stringify(prevNotificacoes) !== JSON.stringify(lista)) {
          return lista;
        }
        return prevNotificacoes; // Se não houver alteração, não faz nada
      });
    }, [registros, tecnicoID]);
  
    useEffect(() => {
      const interval = setInterval(() => {
        fetchNovosRegistros();
      }, 10000); // Busca novos registros a cada 10 segundos
  
      return () => clearInterval(interval);
    }, [fetchNovosRegistros]); // Dependência apenas da função de fetch
  
    useEffect(() => {
      if (!registros) return;
  
      atualizarNotificacoes(); // Chamamos a função para atualizar notificações
    }, [registros, atualizarNotificacoes]); // Atualiza notificações apenas quando `registros` mudam
  
    if (loading) return <Spinner mt={10} />
  
    return (
      <Box pb="70px">
        {/* Topo notificações */}
        <Flex align="center" justify="space-between" p={4} bg="green.600" color="white">
          <Heading size="md">Notificações</Heading>
        </Flex>
  
        {/* Listagem das notificações */}
        {notificacoes.length > 0 ? (
          <Box mt={4} px={4}>
            <Text fontSize="sm" color="gray.600" mb={2}>Ordens Agendadas</Text>
            <Stack spacing={4}>
              {notificacoes.map((ordem, idx) => {
                const dataAgendada = ordem.Data_Agendamento_OS || ordem.Horario_Agendamento_OS;
                return (
                  <Box
                    key={idx}
                    p={4}
                    shadow="md"
                    borderWidth="1px"
                    borderRadius="lg"
                    cursor="pointer"
                    onClick={() => irParaDetalhes(ordem)}
                  >
                    <Text><strong>Cliente:</strong> {ordem.Nome_Cliente}</Text>
                    <Text><strong>Endereço:</strong> {ordem.Endereco_Cliente}</Text>
                    <Text><strong>Data Agendada:</strong> {formatarData(dataAgendada)}</Text>
  
                    <Badge colorScheme={getCorStatus(ordem.Status_OS)}>{ordem.Status_OS}</Badge>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ) : (
          <Text fontSize="sm" color="gray.500">Nenhuma notificação.</Text>
        )}
  
        {/* Adicionando o TecnicoBottomNav */}
        <TecnicoBottomNav />
      </Box>
    );
  }
  
  export default NotificacoesTecnico;
  