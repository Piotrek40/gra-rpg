export class ECS {
    constructor() {
        this.entities = [];
        this.components = {}; // Map<ComponentType, Map<EntityID, ComponentData>>
        this.systems = [];
        this.nextEntityId = 1;
        this.entitiesToDestroy = [];
    }

    // Tworzenie nowej encji
    createEntity() {
        const id = this.nextEntityId++;
        this.entities.push(id);
        return id;
    }

    // Usuwanie encji (oznaczenie do usunięcia)
    destroyEntity(entityId) {
        this.entitiesToDestroy.push(entityId);
    }

    // Dodawanie komponentu do encji
    addComponent(entityId, componentName, data) {
        if (!this.components[componentName]) {
            this.components[componentName] = new Map();
        }
        this.components[componentName].set(entityId, data);
    }

    // Pobieranie komponentu
    getComponent(entityId, componentName) {
        return this.components[componentName] ? this.components[componentName].get(entityId) : null;
    }

    // Sprawdzenie czy encja ma komponent
    hasComponent(entityId, componentName) {
        return this.components[componentName] ? this.components[componentName].has(entityId) : false;
    }

    // Usuwanie komponentu
    removeComponent(entityId, componentName) {
        if (this.components[componentName]) {
            this.components[componentName].delete(entityId);
        }
    }

    // Rejestracja systemu
    addSystem(system) {
        this.systems.push(system);
    }

    // Główna pętla aktualizacji
    update(dt) {
        // Wykonaj systemy
        for (const system of this.systems) {
            system(this, dt);
        }

        // Sprzątanie usuniętych encji
        while (this.entitiesToDestroy.length > 0) {
            const id = this.entitiesToDestroy.pop();
            const index = this.entities.indexOf(id);
            if (index !== -1) {
                this.entities.splice(index, 1);
                // Usuń wszystkie komponenty tej encji
                for (const componentName in this.components) {
                    this.components[componentName].delete(id);
                }
            }
        }
    }

    // Zapytanie o encje z zestawem komponentów
    query(componentNames) {
        return this.entities.filter(entityId => {
            return componentNames.every(name => this.hasComponent(entityId, name));
        });
    }
}
