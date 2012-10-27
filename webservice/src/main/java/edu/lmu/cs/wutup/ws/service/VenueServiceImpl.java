package edu.lmu.cs.wutup.ws.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import edu.lmu.cs.wutup.ws.dao.VenueDao;
import edu.lmu.cs.wutup.ws.model.Circle;
import edu.lmu.cs.wutup.ws.model.Comment;
import edu.lmu.cs.wutup.ws.model.PaginationData;
import edu.lmu.cs.wutup.ws.model.Venue;

@Service
@Transactional
public class VenueServiceImpl implements VenueService {

    @Autowired
    VenueDao venueDao;

    @Override
    public void createVenue(Venue loc) {
        venueDao.createVenue(loc);
    }

    @Override
    public void updateVenue(Venue loc) {
        venueDao.updateVenue(loc);
    }

    @Override
    public Venue findVenueById(int id) {
        return venueDao.findVenueById(id);
    }

    @Override
    public List<Venue> findVenues(String name, Integer eventId, Circle circle, PaginationData pagination) {
        return venueDao.findVenues(name, eventId, circle, pagination);
    }

    @Override
    public void deleteVenue(int venueId) {
        venueDao.deleteVenue(venueId);
    }

    @Override
    public int findNumberOfVenues() {
        return venueDao.findNumberOfVenues();
    }

    @Override
    public void addComment(int venueId, Comment comment) {
        venueDao.addComment(venueId, comment);
    }

    @Override
    public void updateComment(int commentId, Comment comment) {
        venueDao.updateComment(commentId, comment);
    }

    @Override
    public List<Comment> findComments(int venueId, PaginationData pagination) {
        return venueDao.findComments(venueId, pagination);
    }

    @Override
    public void deleteComment(int venueId, int commentId) {
        venueDao.deleteComment(venueId, commentId);
    }
}
