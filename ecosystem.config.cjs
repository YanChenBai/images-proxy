/**
 * @type {import('pm2').StartOptions[]}
 */
const apps = [
	{
		name: "ImageProxy",
		script: "src/index.ts",
		interpreter: "bun",
	},
];

module.exports = {
	apps,
};
