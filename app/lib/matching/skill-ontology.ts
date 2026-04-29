/**
 * skill-ontology.ts
 * Production-grade Skill Ontology Graph System
 */

export interface SkillNode {
  id: string;
  name: string;
  category: 'field' | 'sub-field' | 'tool' | 'competency';
  parents: string[];
}

export class SkillOntology {
  private nodes: Map<string, SkillNode> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  constructor() {
    this.seedGraph();
  }

  /**
   * Initial seed data for the ontology.
   * In production, this would be loaded from a database or remote JSON.
   */
  private seedGraph() {
    const skills: SkillNode[] = [
      // Design Cluster
      { id: 'design', name: 'Design', category: 'field', parents: [] },
      { id: 'graphic_design', name: 'Graphic Design', category: 'sub-field', parents: ['design'] },
      { id: 'ui_ux', name: 'UI/UX Design', category: 'sub-field', parents: ['design'] },
      { id: 'photoshop', name: 'Photoshop', category: 'tool', parents: ['graphic_design'] },
      { id: 'illustrator', name: 'Illustrator', category: 'tool', parents: ['graphic_design'] },
      { id: 'canva', name: 'Canva', category: 'tool', parents: ['graphic_design'] },
      { id: 'figma', name: 'Figma', category: 'tool', parents: ['ui_ux'] },
      { id: 'sketch', name: 'Sketch', category: 'tool', parents: ['ui_ux'] },

      // Engineering Cluster
      { id: 'engineering', name: 'Engineering', category: 'field', parents: [] },
      { id: 'software_eng', name: 'Software Engineering', category: 'sub-field', parents: ['engineering'] },
      { id: 'devops', name: 'DevOps', category: 'sub-field', parents: ['software_eng'] },
      { id: 'frontend', name: 'Frontend', category: 'sub-field', parents: ['software_eng'] },
      { id: 'backend', name: 'Backend', category: 'sub-field', parents: ['software_eng'] },
      { id: 'react', name: 'React', category: 'tool', parents: ['frontend'] },
      { id: 'nextjs', name: 'Next.js', category: 'tool', parents: ['frontend'] },
      { id: 'nodejs', name: 'Node.js', category: 'tool', parents: ['backend'] },
      { id: 'docker', name: 'Docker', category: 'tool', parents: ['devops'] },
      { id: 'kubernetes', name: 'Kubernetes', category: 'tool', parents: ['devops'] },
    ];

    skills.forEach(node => {
      this.nodes.set(node.id, node);
      if (!this.adjacencyList.has(node.id)) this.adjacencyList.set(node.id, new Set());
      
      node.parents.forEach(parent => {
        if (!this.adjacencyList.has(parent)) this.adjacencyList.set(parent, new Set());
        this.adjacencyList.get(parent)!.add(node.id);
        this.adjacencyList.get(node.id)!.add(parent); // Bidirectional for similarity
      });
    });
  }

  /**
   * Calculates similarity between two skills based on graph distance.
   * Score = 1 / (distance + 1)
   */
  public getSkillSimilarity(skillA: string, skillB: string): number {
    const idA = this.normalizeId(skillA);
    const idB = this.normalizeId(skillB);

    if (idA === idB) return 1.0;
    if (!this.nodes.has(idA) || !this.nodes.has(idB)) return 0.0;

    const distance = this.bfsDistance(idA, idB);
    if (distance === -1) return 0.0;

    // Decay formula for similarity
    return Math.pow(0.8, distance);
  }

  private normalizeId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private bfsDistance(start: string, target: string): number {
    const queue: [string, number][] = [[start, 0]];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
      const [current, dist] = queue.shift()!;
      if (current === target) return dist;

      const neighbors = this.adjacencyList.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([neighbor, dist + 1]);
          }
        }
      }
    }
    return -1;
  }
}

export const skillOntology = new SkillOntology();
