/**
 * Textos de los objetos interactivos de los interiores.
 * Separados de la geometría para poder editarlos (o traducirlos) sin tocar las escenas.
 */
export interface ObjectContent {
  name: string;
  verb: string;
  description?: string;
  details?: Record<string, string>;
}

export const CAFETERIA_CONTENT = {
  mostrador: {
    name: 'Mostrador',
    verb: 'Ver',
    description: 'Aquí se hacen los pedidos. Todo se prepara al momento con café de origen colombiano.',
    details: {
      'Café americano': '$3.000',
      Capuchino: '$5.500',
      'Chocolate caliente': '$4.500',
      'Croissant de almendras': '$4.000',
    },
  },
  maquina: {
    name: 'Máquina de café',
    verb: 'Usar',
    description: 'Espresso de dos grupos. Muele el grano, lo prensa y extrae un shot en 25 segundos. ¡Mira cómo se llena la taza!',
    details: { Presión: '9 bares', Temperatura: '93 °C', Origen: 'Huila, Colombia' },
  },
  vitrina: {
    name: 'Vitrina de postres',
    verb: 'Ver',
    description: 'Postres horneados esta mañana en el obrador del café.',
    details: { 'Pastel de zanahoria': '$6.000', 'Galleta de avena': '$2.500', 'Torta de chocolate': '$6.500' },
  },
  pizarra: {
    name: 'Pizarra del día',
    verb: 'Leer',
    description: 'Especial de hoy: affogato con helado de vainilla y un shot de espresso.',
    details: { Especial: 'Affogato', Precio: '$7.000', 'Hora feliz': '4:00 – 6:00 p. m.' },
  },
} satisfies Record<string, ObjectContent>;

export const MENU_BOARD_LINES = ['MENÚ', 'Americano ....... 3.000', 'Capuchino ....... 5.500', 'Chocolate ....... 4.500', 'Croissant ........ 4.000'];

export const LIBRARY_CONTENT = {
  quijote: {
    name: 'Don Quijote de la Mancha',
    verb: 'Leer',
    description:
      'Un hidalgo que leyó demasiadas novelas de caballería decide hacerse caballero andante. Junto a Sancho Panza recorre La Mancha confundiendo molinos con gigantes.',
    details: { Autor: 'Miguel de Cervantes', Año: '1605', Sección: 'Clásicos', Estado: 'Disponible' },
  },
  maria: {
    name: 'María',
    verb: 'Leer',
    description:
      'Novela romántica ambientada en una hacienda del Valle del Cauca. Efraín vuelve a casa y se enamora de su prima María, en medio de paisajes descritos con detalle.',
    details: { Autor: 'Jorge Isaacs', Año: '1867', Sección: 'Literatura colombiana', Estado: 'Disponible' },
  },
  odisea: {
    name: 'La Odisea',
    verb: 'Leer',
    description:
      'Poema épico sobre el regreso de Odiseo a Ítaca después de la guerra de Troya: diez años de viaje entre cíclopes, sirenas y tormentas.',
    details: { Autor: 'Homero', Época: 'Siglo VIII a. C.', Sección: 'Poesía épica', Estado: 'Prestado' },
  },
  prestamos: {
    name: 'Mostrador de préstamos',
    verb: 'Ver',
    description: 'Pide libros prestados con tu carné de la biblioteca. El préstamo dura 15 días y se puede renovar dos veces.',
    details: { Horario: '8:00 – 18:00', 'Libros por persona': '3', Multas: 'No hay, ¡solo devuélvelos!' },
  },
  globo: { name: 'Globo terráqueo', verb: 'Girar' },
  lampara: { name: 'Lámpara de lectura', verb: 'Encender / apagar' },
} satisfies Record<string, ObjectContent>;
