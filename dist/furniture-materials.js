// Texture filenames follow the row-major order of the original ImageGen atlases.
export const furnitureSets = {
  woods: ['smoked-walnut','honey-oak','mahogany','burr-walnut','limed-ash',
    'quarter-sawn-oak','olive-painted-oak','rosewood','aged-oak'],
  upholstery: ['forest-velvet','cognac-leather','rust-herringbone','petrol-chenille','rose-boucle',
    'oatmeal-linen','indigo-ticking','moss-tartan','terracotta-diamond'],
  bedding: ['cotton-percale','sage-wool','rose-linen','navy-windowpane','clay-jacquard',
    'sand-quilt','ochre-velvet','taupe-pinstripe','ivory-damask'],
  details: ['verdigris-brass','satin-brass','saddle-leather','botanical-linen','iberian-weave',
    'moss-flatweave','burgundy-damask','charcoal-tweed','houndstooth'],
};

export function furnitureFinish(name, group) {
  if(name.endsWith('brass')) return {roughness:.49,metalness:.46,bump:.002};
  if(name.endsWith('leather')) return {roughness:.57,metalness:0,bump:.003};
  if(group==='woods') return {roughness:.57,metalness:0,bump:.0024};
  return {roughness:.91,metalness:0,bump:.0035};
}
