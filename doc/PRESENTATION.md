Cuando vi que esta etapa de la hackathon era de gaming, me fui por una tangentecita. Vamos a usar herramientas decentralizadas: Bitcoin, Nostr, donde podés validar qué publican los otros sin necesidad de un servidor central. Podés jugar juegos determinísticos como ajedrez publicando estados y cambios de estados. Como acordaron usar las mismas reglas, aunque no haya un referee central, no podés snipear al rey desde el otro lado del mapa sin que el otro jugador te repudie la movida por inválida.

Pero ¿cómo hacemos para tirar dados sin un servidor central? ¿Te juro que corrí HS-CS-PRNG con un agregador multifuente una sola vez y me dio justo el seis que necesitaba trust me bro? ¿Caemos en usar un oráculo central que es precisamente lo que queremos evitar?

Acá entra URD: URD's Roll Derivation; recursivo, pero además Urd es una de las tres nornas nórdicas del destino:
* Armás una ronda de jugadores y cada uno aporta secretos aleatorios cerrados que los otros no conocen
* Cada vez que se necesita un número aleatorio se referencia un hash del estado actual y se piden secretos anteriores al estado actual para combinar
* Una vez comprometidos, se abren los secretos pedidos, se salan con el hash de juego, se combinan, y de ahí se obtiene un resultado

Este resultado se puede verificar retroactivamente y nadie podría haberlo influenciado proactivamente ni granjear resultados favorables.

Hay aspectos no alcanzados por Urd como la velocidad o caída de mensajes. Esas son cuestiones o de transporte, o del juego en sí, o hasta fuera del juego.

Hay funcionalidad no implementada como obtención de valores interdependientes, como sacar boca abajo una carta de un mazo en común. Se planea implementarlo pronto con encriptación conmutativa tipo Mind Poker.

Teniendo un juego en mente, una capa de transporte autenticado y ordenado, y una plataforma de encriptación y firma, agregás URD y podés generar resultados no predecibles en forma verificable, sea por email+PGP, telegrama+SALTPACK, paloma mensajera+SIGNIFY... ¡o Nostr!

¿¡Y EL JUEGO PARA LA HACKATHON DE NOSTR!?

Como technology demonstrator, estoy armando VESTA: VESTA Expanding Settlements Through Accord, y la diosa romana del hogar. Es un juego de estrategia de construcción y comercio con una mecánica bastante conocida:
* Se junta una ronda de jugadores
* Aleatoriamente generan un mapa de territorio
* Al principio de cada turno terrenos al azar generan sus recursos
* Los jugadores comercian y construyen
* El que más rápido construye su civilización gana

El gameplay es conocido; deliberadamente no inventa nada para que quede claro dónde y cómo se usan los dados. Para evitar servidores centrales, va a usar URD para los dados y cartas y Nostr para el transporte. La implementación de ejemplo en GitHub Pages se puede copiar, redesplegar, reimplementar sin problema. Consígalo gratis en Luna Negra.

