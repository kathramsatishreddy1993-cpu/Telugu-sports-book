export class BaseSportsProvider {
  constructor(name) {
    this.name = name;
  }

  async fetchEvents(sportCategory) {
    throw new Error(`fetchEvents() is not implemented in ${this.name}`);
  }

  normalizeEvent(rawEvent, sportCategory) {
    throw new Error(`normalizeEvent() is not implemented in ${this.name}`);
  }
}