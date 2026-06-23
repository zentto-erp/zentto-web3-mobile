// Contenido legal del neobanco cripto Zentto Web3 (mismo tono que el backoffice).
// Texto en español; estructura por secciones para render simple.

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  slug: 'terminos' | 'privacidad' | 'responsabilidad';
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

// Datos legales de la empresa operadora (los mismos en todas las apps Zentto).
export const COMPANY = {
  legalName: 'ZENTTO GLOBAL TECHNOLOGY, C.A.',
  rif: 'J-50849797-0',
  country: 'Venezuela',
  activity:
    'empresa venezolana de tecnología dedicada al desarrollo de software y soluciones informáticas en la nube',
  ecosystem:
    'Desarrollamos el ecosistema Zentto: ERP en la nube para empresas, soluciones verticales por industria (hotelería, salud, educación, tickets, alquiler), herramientas para desarrolladores y productos de finanzas digitales',
  email: 'soporte@zentto.net',
  privacyEmail: 'privacidad@zentto.net',
  site: 'zentto.net',
};

// Redes sociales del ecosistema Zentto.
export const SOCIAL = {
  instagram: 'https://instagram.com/appzenttonet',
  x: 'https://x.com/appzentto',
  linkedin: 'https://www.linkedin.com/in/zentto-global-technology-c-a-a19701418/',
  facebook: 'https://www.facebook.com/profile.php?id=61578642394018',
};

// ID del paquete en Play Store (para "Calificar").
export const PLAY_STORE_ID = 'net.zentto.web3app';

// Reportar una falla → abre el formulario de zentto-support (dispara el CI/CD que
// triagea con IA y deriva al departamento). module=Mobile prellenado.
export function bugReportUrl(appLabel: string, version: string): string {
  const body = `Reporte desde ${appLabel} v${version}.\n\n`;
  return (
    'https://github.com/zentto-erp/zentto-support/issues/new' +
    `?template=bug_report.yml&module=Mobile&description=${encodeURIComponent(body)}`
  );
}

export const LEGAL_DOCS: Record<LegalDoc['slug'], LegalDoc> = {
  terminos: {
    slug: 'terminos',
    title: 'Términos y Condiciones',
    updatedAt: 'junio de 2026',
    intro:
      'Lee atentamente estos Términos antes de utilizar Zentto. Definen tus derechos y obligaciones como usuario del servicio.',
    sections: [
      {
        heading: 'Identificación del operador',
        paragraphs: [
          'La aplicación Zentto Web3 es desarrollada y operada por ZENTTO GLOBAL TECHNOLOGY, C.A., empresa venezolana identificada con el RIF J-50849797-0, dedicada al desarrollo de software y soluciones informáticas en la nube (en adelante, “el Operador”).',
          'El Operador desarrolla el ecosistema Zentto, que incluye un ERP empresarial, soluciones verticales por industria, herramientas para desarrolladores y productos de finanzas digitales como esta aplicación.',
          'Zentto Web3 es un producto tecnológico en fase de desarrollo. La Plataforma se ofrece como herramienta de software; no constituye, por sí misma, una entidad bancaria, casa de cambio ni institución financiera regulada.',
        ],
      },
      {
        heading: 'Objeto y aceptación',
        paragraphs: [
          'Estos Términos y Condiciones regulan el acceso y uso de la plataforma Zentto Web3 (en adelante, “la Plataforma”), una plataforma de finanzas digitales custodial que permite mantener saldos en criptoactivos, realizar transferencias internas, depósitos y retiros on-chain, y operar en un mercado entre usuarios (P2P).',
          'Al registrarte y utilizar la Plataforma aceptas estos Términos en su totalidad. Si no estás de acuerdo con alguna de sus cláusulas, debes abstenerte de usar el servicio.',
        ],
      },
      {
        heading: 'Cuenta de usuario',
        paragraphs: [
          'Para usar la Plataforma debes crear una cuenta con datos veraces y mantenerlos actualizados. Eres el único responsable de la confidencialidad de tus credenciales, de tu PIN de acceso y de toda actividad realizada desde tu cuenta.',
          'La Plataforma puede exigir la verificación de tu identidad (KYC) como condición para habilitar determinadas funciones, incluidos depósitos, retiros y operaciones P2P.',
        ],
      },
      {
        heading: 'Custodia de criptoactivos',
        paragraphs: [
          'La Plataforma opera bajo un modelo custodial: los saldos se mantienen en infraestructura gestionada por el operador. Los importes mostrados como “disponible” pueden usarse de inmediato; los importes “retenidos” están bloqueados por operaciones en curso (por ejemplo, un retiro o un escrow P2P).',
          'El usuario reconoce que los criptoactivos son volátiles y que su valor puede variar significativamente. La Plataforma no garantiza rendimiento, revalorización ni convertibilidad a moneda fiduciaria.',
        ],
      },
      {
        heading: 'Depósitos y retiros on-chain',
        paragraphs: [
          'Los depósitos se acreditan una vez detectada y confirmada la transacción en la red correspondiente. Enviar activos a una red o token distintos a los indicados puede resultar en la pérdida irreversible de fondos; el usuario asume ese riesgo.',
          'Los retiros requieren autenticación reforzada (2FA) y pueden estar sujetos a límites, revisiones de cumplimiento y tiempos de liquidación. Las direcciones de destino son responsabilidad exclusiva del usuario.',
        ],
      },
      {
        heading: 'Mercado P2P',
        paragraphs: [
          'El mercado P2P permite a los usuarios publicar y tomar ofertas de compra y venta de criptoactivos pagaderas en moneda local. Al vender, el cripto del anunciante queda en escrow hasta que confirme la recepción del pago.',
          'La Plataforma actúa como custodio del escrow, pero no es parte de la relación comercial entre comprador y vendedor ni garantiza la solvencia o buena fe de las contrapartes. El vendedor solo debe liberar el cripto tras verificar el pago en su propia cuenta. Los conflictos derivados de operaciones P2P son responsabilidad de las partes.',
        ],
      },
      {
        heading: 'Conductas prohibidas',
        paragraphs: [
          'Está prohibido utilizar la Plataforma para actividades ilícitas, incluyendo lavado de dinero, financiamiento del terrorismo, fraude, evasión de sanciones o cualquier operación contraria a la ley aplicable.',
          'La Plataforma puede suspender o cerrar cuentas, retener fondos y reportar a las autoridades competentes ante indicios razonables de uso indebido, conforme a sus obligaciones de cumplimiento.',
        ],
      },
      {
        heading: 'Modificaciones y ley aplicable',
        paragraphs: [
          'El operador puede modificar estos Términos en cualquier momento. El uso continuado de la Plataforma tras la publicación de los cambios implica su aceptación.',
          'Estos Términos se rigen por la legislación aplicable en la jurisdicción del operador. Cualquier controversia se someterá a los tribunales competentes de dicha jurisdicción.',
        ],
      },
    ],
  },
  privacidad: {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    updatedAt: 'junio de 2026',
    intro:
      'En Zentto tratamos tus datos personales con responsabilidad y transparencia. Esta Política describe cómo los recopilamos, usamos y protegemos.',
    sections: [
      {
        heading: 'Responsable del tratamiento',
        paragraphs: [
          'El responsable del tratamiento de los datos personales recopilados a través de la Plataforma es ZENTTO GLOBAL TECHNOLOGY, C.A. (RIF J-50849797-0), empresa venezolana dedicada al desarrollo de software. Esta Política explica qué datos tratamos, con qué finalidad, sobre qué base legal y qué derechos te asisten.',
        ],
      },
      {
        heading: 'Datos que recopilamos',
        paragraphs: [
          'Datos de identificación y contacto: nombre, correo electrónico, número de teléfono y, cuando corresponda, documento de identidad y nacionalidad aportados durante la verificación KYC.',
          'Datos de uso y operación: saldos, movimientos, depósitos, retiros, órdenes y trades del mercado P2P, así como métodos de cobro que registres.',
          'Datos técnicos: dirección IP, identificadores de sesión y registros de seguridad necesarios para proteger la cuenta. El PIN de acceso y la huella se procesan localmente en tu dispositivo y no se envían a nuestros servidores.',
        ],
      },
      {
        heading: 'Finalidades del tratamiento',
        paragraphs: [
          'Prestar el servicio de finanzas digitales custodial, ejecutar tus operaciones y mantener tu cuenta.',
          'Cumplir obligaciones legales y regulatorias, en particular las relativas a la prevención de lavado de dinero y financiamiento del terrorismo, lo que incluye verificación de identidad y screening contra listas de sanciones.',
          'Garantizar la seguridad de la Plataforma, prevenir el fraude y atender solicitudes de soporte.',
        ],
      },
      {
        heading: 'Conservación y seguridad',
        paragraphs: [
          'Conservamos tus datos durante el tiempo necesario para prestar el servicio y para cumplir con los plazos legales de conservación aplicables a entidades financieras y de cumplimiento.',
          'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, incluyendo cifrado en tránsito, autenticación reforzada (2FA), bloqueo de la app por PIN/huella y control de acceso. Ninguna medida es infalible, por lo que no podemos garantizar seguridad absoluta.',
        ],
      },
      {
        heading: 'Compartición de datos',
        paragraphs: [
          'No vendemos tus datos personales. Solo los compartimos con proveedores que nos prestan servicios (por ejemplo, verificación de identidad o infraestructura), bajo obligaciones de confidencialidad, y con autoridades competentes cuando exista una obligación legal de hacerlo.',
          'En el mercado P2P, los datos estrictamente necesarios para completar una operación (por ejemplo, los de un método de cobro que tú decidas compartir) podrán ser visibles para tu contraparte.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad sobre tus datos, en los términos previstos por la normativa aplicable. Algunos derechos pueden estar limitados cuando exista una obligación legal de conservar la información.',
          'Para ejercer tus derechos o resolver dudas sobre esta Política, escríbenos a privacidad@zentto.net.',
        ],
      },
    ],
  },
  responsabilidad: {
    slug: 'responsabilidad',
    title: 'Aviso de Responsabilidad',
    updatedAt: 'junio de 2026',
    intro:
      'Operar con criptoactivos conlleva riesgos. Este aviso resume las limitaciones y responsabilidades del uso de Zentto.',
    sections: [
      {
        heading: 'Riesgo de los criptoactivos',
        paragraphs: [
          'Los criptoactivos son instrumentos de alto riesgo y elevada volatilidad. Su valor puede subir o bajar de forma abrupta y podrías perder parte o la totalidad de tus fondos. No inviertas más de lo que estés dispuesto a perder.',
          'Zentto no ofrece asesoría financiera, fiscal ni de inversión. Las decisiones que tomes son de tu exclusiva responsabilidad.',
        ],
      },
      {
        heading: 'Naturaleza del servicio',
        paragraphs: [
          'Zentto es una plataforma de finanzas digitales custodial en fase de desarrollo que opera, en parte, sobre redes de prueba (testnet). Algunos saldos y operaciones pueden tener carácter demostrativo y no representar valor económico real.',
          'El servicio se ofrece “tal cual” y “según disponibilidad”. Pueden existir interrupciones, mantenimientos o cambios de funcionalidad sin previo aviso.',
        ],
      },
      {
        heading: 'Operaciones on-chain irreversibles',
        paragraphs: [
          'Las transacciones en blockchain son, por su naturaleza, irreversibles. Verifica siempre la red, el token y la dirección de destino antes de confirmar un retiro. Zentto no puede revertir ni recuperar fondos enviados por error.',
        ],
      },
      {
        heading: 'Operaciones P2P',
        paragraphs: [
          'En el mercado P2P, Zentto custodia el escrow del cripto pero no interviene en el pago en moneda local entre las partes. Como vendedor, libera el cripto únicamente cuando hayas verificado el pago en tu propia cuenta. Como comprador, paga solo por los canales acordados con la contraparte.',
          'Zentto no se hace responsable de fraudes, contracargos o disputas derivados de pagos realizados fuera de la Plataforma.',
        ],
      },
      {
        heading: 'Seguridad de tu cuenta',
        paragraphs: [
          'Protege tus credenciales, tu PIN y tu segundo factor (2FA). No los compartas con nadie. Activa el bloqueo por PIN o huella para añadir una capa de protección en tu dispositivo.',
          'Zentto nunca te pedirá tu contraseña, PIN o códigos 2FA por correo, teléfono o mensajería. Desconfía de cualquier solicitud de ese tipo.',
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley, el operador no será responsable por daños indirectos, lucro cesante, pérdida de datos ni por pérdidas derivadas de la volatilidad de los criptoactivos, fallos de redes blockchain de terceros, errores del usuario o uso indebido de la cuenta.',
        ],
      },
    ],
  },
};
