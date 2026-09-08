export function assessPhotograph({distance,frameX,frameY,depth,focus,occluded,coverage}) {
  const inFrame = depth > -1 && depth < 1 && Math.abs(frameX) < .66 && Math.abs(frameY) < .66
  const range = distance >= 2 && distance <= 18 && coverage > .06 && coverage < .86
  const sharp = Math.abs(focus-distance) <= Math.max(.8,distance*.22)
  const ready = inFrame && range && sharp && !occluded
  let hint = 'Fotografía lista. Dispara cuando quieras.'
  if (!inFrame) hint = 'Arrastra la vista para colocar el sujeto en el encuadre.'
  else if (occluded) hint = 'Busca una vista despejada; algo tapa al sujeto.'
  else if (!range) hint = distance < 2 || coverage >= .86 ? 'Retrocede para incluir al sujeto.' : 'Acércate o aumenta el zoom.'
  else if (!sharp) hint = 'Gira el enfoque hasta ver nítido al sujeto.'
  return {ready,inFrame,range,sharp,occluded,hint,distance:Math.round(distance*10)/10}
}
