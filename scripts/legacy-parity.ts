// Records what the current deployer's getArtifacts makes of each fixture
// template, so the replacement can be compared against it (and its
// intended differences listed). Run: npx tsx scripts/legacy-parity.ts
import * as fs from 'fs';
import * as path from 'path';
import { getArtifacts, Resource } from '../src/utils/arm_template_utils';

const root = path.join(__dirname, '..', 'test', 'fixtures', 'templates');

function parseContent(content: string): unknown {
    try {
        return JSON.parse(content);
    } catch {
        // Corrupted by the old text substitution; keep the raw text.
        return { unparseable: content };
    }
}

async function run(dir: string): Promise<unknown> {
    const template = fs.readFileSync(path.join(dir, 'template.json'), 'utf8');
    const parameters = fs.readFileSync(path.join(dir, 'parameters.json'), 'utf8');
    // The action forces workspaceName to the target, so the fixture's own
    // parameters file names the target workspace.
    const target: string = JSON.parse(parameters).parameters.workspaceName.value;
    try {
        const batches: Resource[][] = await getArtifacts(parameters, template, '', target, 'eastus');
        return batches.flatMap((batch, index) => batch.map((r) => ({
            name: r.name,
            type: r.type,
            isDefault: r.isDefault,
            content: parseContent(r.content),
            dependson: r.dependson,
            batch: index,
        })));
    } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
    }
}

async function main(): Promise<void> {
    const cases = fs.readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'template.json')))
        .map((d) => d.name)
        .sort();
    for (const name of cases) {
        const result = await run(path.join(root, name));
        fs.writeFileSync(path.join(root, name, 'legacy.json'), JSON.stringify(result, null, 2) + '\n');
        const status = Array.isArray(result) ? `${result.length} artifacts` : `error: ${(result as { error: string }).error}`;
        console.log(`${name}: ${status}`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
