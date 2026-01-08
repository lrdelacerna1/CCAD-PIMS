import { Area, User } from '../../frontend/types';
import { areas, users, saveUsersAndPasswords } from '../db/mockDb';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export class AreaService {
    static async getAreas(): Promise<Area[]> {
        return JSON.parse(JSON.stringify(areas));
    }

    static async createArea(name: string): Promise<Area> {
        if (areas.some(a => a.name.toLowerCase() === name.toLowerCase())) {
            throw new Error(`Area with name "${name}" already exists.`);
        }
        const newArea: Area = {
            id: uuidv4(),
            name,
        };
        areas.push(newArea);
        return newArea;
    }

    static async updateArea(id: string, name: string): Promise<Area> {
        const areaIndex = areas.findIndex(a => a.id === id);
        if (areaIndex === -1) {
            throw new Error('Area not found.');
        }
        if (areas.some(a => a.name.toLowerCase() === name.toLowerCase() && a.id !== id)) {
            throw new Error(`Area with name "${name}" already exists.`);
        }
        areas[areaIndex].name = name;
        return { ...areas[areaIndex] };
    }

    static async deleteArea(id: string): Promise<void> {
        const areaIndex = areas.findIndex(a => a.id === id);

        if (areaIndex !== -1) {
            areas.splice(areaIndex, 1);

            const storedUser = localStorage.getItem('user');
            const loggedInUser: User | null = storedUser ? JSON.parse(storedUser) : null;
            
            let usersModified = false;

            // If an area was deleted, remove its ID from all users.
            users.forEach(user => {
                if (user.managedAreaIds?.includes(id)) {
                    usersModified = true;
                    user.managedAreaIds = user.managedAreaIds.filter(areaId => areaId !== id);

                    // If the modified user is the currently logged-in user, update their localStorage to prevent stale session data.
                    if (loggedInUser && loggedInUser.id === user.id) {
                        localStorage.setItem('user', JSON.stringify(user));
                    }
                }
            });

            if (usersModified) {
                saveUsersAndPasswords();
            }
        }
    }
}