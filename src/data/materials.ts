/**
 * Lista base de materiales del ticket físico, en orden.
 * Cada entrada incluye aliases para cubrir variaciones de escritura manuscrita
 * que el modelo OCR puede leer de forma diferente.
 * defaultPrice es el precio por kg precargado (editable desde el panel de precios).
 */
export const MATERIALS = [
  { id: '1',  name: 'Cobre',          defaultPrice: 11000, aliases: ['cobre', 'cob', 'corre', 'corr'],                        orderIndex: 1  },
  { id: '2',  name: 'Bronce',         defaultPrice: 5500,  aliases: ['bronce', 'bronc', 'bron'],                              orderIndex: 2  },
  { id: '3',  name: 'Aluminio',       defaultPrice: 1200,  aliases: ['aluminio', 'alum', 'alumin'],                           orderIndex: 3  },
  { id: '4',  name: 'Plomo',          defaultPrice: 1100,  aliases: ['plomo', 'plom'],                                        orderIndex: 4  },
  { id: '5',  name: 'Radiador',       defaultPrice: 2000,  aliases: ['radiador', 'radiad', 'radia'],                          orderIndex: 5  },
  { id: '6',  name: 'Mixto',          defaultPrice: 1500,  aliases: ['mixto', 'radiador mixto', 'rad mixto', 'radmix'],       orderIndex: 6  },
  { id: '7',  name: 'Bateria',        defaultPrice: 400,   aliases: ['bateria', 'batería', 'bater', 'bat'],                   orderIndex: 7  },
  { id: '8',  name: 'Moto',           defaultPrice: 300,   aliases: ['moto', 'bateria chica', 'bat chica', 'batchica'],       orderIndex: 8  },
  { id: '9',  name: 'Carton',         defaultPrice: 150,   aliases: ['carton', 'cartón', 'cart'],                             orderIndex: 9  },
  { id: '10', name: 'Chatarra',       defaultPrice: 150,   aliases: ['chatarra', 'chatat', 'chatar'],                         orderIndex: 10 },
  { id: '11', name: 'Perfil',         defaultPrice: 1500,  aliases: ['perfil', 'perfi'],                                      orderIndex: 11 },
  { id: '12', name: 'Estaño',         defaultPrice: 5000,  aliases: ['estaño', 'estano', 'estan'],                            orderIndex: 12 },
  { id: '13', name: 'Zinc',           defaultPrice: 1200,  aliases: ['zinc', 'cinc'],                                         orderIndex: 13 },
  { id: '14', name: 'Aluminio chapa', defaultPrice: 1300,  aliases: ['aluminio chapa', 'alum chapa', 'alumchapa'],            orderIndex: 14 },
  { id: '15', name: 'Aluminio duro',  defaultPrice: 1300,  aliases: ['aluminio duro', 'alum duro', 'alumduro'],               orderIndex: 15 },
  { id: '16', name: 'Latita',         defaultPrice: 1300,  aliases: ['latita', 'lata', 'latitas'],                            orderIndex: 16 },
  { id: '17', name: 'Acero',          defaultPrice: 300,   aliases: ['acero', 'acera', 'acer'],                               orderIndex: 17 },
] as const
