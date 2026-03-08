// Função para capitalizar texto (primeira letra maiúscula)
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Função para formatar tipos de estrutura
export function formatEstrutura(tipo: string): string {
  switch (tipo?.toLowerCase()) {
    case 'telhado':
      return 'Telhado';
    case 'solo':
      return 'Solo';
    default:
      return capitalize(tipo || '');
  }
}

// Função para formatar tipos de inversor
export function formatInversor(tipo: string): string {
  switch (tipo?.toLowerCase()) {
    case 'string':
      return 'String';
    case 'micro':
      return 'Micro';
    default:
      return capitalize(tipo || '');
  }
}

// Função para formatar tipos de rede
export function formatRede(tipo: string): string {
  switch (tipo?.toLowerCase()) {
    case 'monofasico':
      return 'Monofásico';
    case 'trifasico':
      return 'Trifásico';
    default:
      return capitalize(tipo || '');
  }
}

// Função para formatar valores monetários
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Função para formatar potência
export function formatPotencia(value: number, unidade: string = 'kWp'): string {
  return `${value} ${unidade}`;
}

// Função para formatar data e hora
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Função para formatar status do kit
export function formatStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completo':
      return 'Completo';
    case 'zerado':
      return 'Zerado';
    default:
      return capitalize(status || '');
  }
}

// Função para formatar transformador
export function formatTransformador(valor: string): string {
  switch (valor?.toLowerCase()) {
    case 'sim':
      return 'Sim';
    case 'nao':
    case 'não':
      return 'Não';
    default:
      return capitalize(valor || '');
  }
}