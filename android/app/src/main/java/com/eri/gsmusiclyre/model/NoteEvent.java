package com.eri.gsmusiclyre.model;

import java.util.List;

public class NoteEvent {
    private final double time;
    private final List<String> notes;

    public NoteEvent(double time, List<String> notes) {
        this.time = time;
        this.notes = notes;
    }

    public double getTime() {
        return time;
    }

    public List<String> getNotes() {
        return notes;
    }
}
