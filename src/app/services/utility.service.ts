import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {
  /**
   * This function is used to convert an Array with Objects to a Map with key-value pairs where the key, the name of the item is and the value the item itself.
   *
   * @param saveVar This variable safes the new generated map.
   * @param dataToMap This is the Data(Array) to Map.
   * @returns The saved Map in format: item.name = item
   */
  mapArray(saveVar: Record<string, any>, dataToMap: any[]) {
    // Wir erstellen das gemappte Objekt temporär...
    const mapped = dataToMap.reduce(
      (acc, item) => {
        acc[item.name] = item;
        return acc;
      },
      {} as Record<string, any>,
    );

    // ...und kopieren dessen Eigenschaften in das existierende 'saveVar' Objekt
    Object.assign(saveVar, mapped);
  }


  /**
   * Gibt einen zufälligen Index (Ganzzahl) basierend auf der Länge des übergebenen Arrays zurück.
   * @param array Das Array, aus dem ein zufälliger Index ermittelt werden soll.
   * @returns Eine Zufallszahl zwischen 0 und array.length - 1. Wenn das Array leer ist, wird 0 zurückgegeben.
   */
  getRandomIndex(array: any[]): number {
    if (!array || array.length === 0) {
      return 0;
    }
    // Math.random() gibt eine Zahl zwischen 0 (inklusive) und 1 (exklusive)
    // Mal der Länge und abgerundet mit Math.floor ergibt exakt die Range [0, length - 1]
    return Math.floor(Math.random() * array.length);
  }

}
